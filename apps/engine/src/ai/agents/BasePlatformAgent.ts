/**
 * Base Platform Agent
 *
 * Abstract base class for all platform-specific AI agents.
 * Implements the Template Method pattern for script generation.
 *
 * @module ai/agents/BasePlatformAgent
 */

import type { TrendData, ContentCategory } from '@icerik/shared';
import type {
    Platform,
    PlatformScript,
    PlatformAlgorithmFocus,
    PlatformAlgorithmExpert,
    VisualStyle,
    AudioStyle,
    ScriptSection,
    MultiPlatformOptions,
} from '@icerik/shared';
import { PLATFORM_ALGORITHM_FOCUS, PLATFORM_LABELS } from '@icerik/shared';
import { getGeminiClient, GeminiError } from '../gemini.js';
import { createChildLogger } from '../../utils/logger.js';

/**
 * Agent generation options (internal)
 */
export interface AgentOptions {
    durationSeconds: number;
    tone: 'casual' | 'professional' | 'humorous' | 'dramatic';
    language: 'en' | 'tr';
    includeHook: boolean;
    includeCta: boolean;
}

/**
 * Default agent options
 */
export const DEFAULT_AGENT_OPTIONS: AgentOptions = {
    durationSeconds: 30,
    tone: 'casual',
    language: 'tr',
    includeHook: true,
    includeCta: true,
};

/**
 * Language-specific instructions
 */
const LANGUAGE_INSTRUCTIONS: Record<AgentOptions['language'], { name: string; instructions: string }> = {
    en: {
        name: 'English',
        instructions: 'Write the script in English. Use natural, conversational American English.',
    },
    tr: {
        name: 'Turkish',
        instructions: 'Scripti Türkçe yaz. Doğal ve günlük Türkçe kullan. Gen Z ve milenyallara hitap et.',
    },
};

/**
 * Tone-specific instructions
 */
const TONE_INSTRUCTIONS: Record<AgentOptions['tone'], string> = {
    casual: 'Use conversational language, contractions, and a friendly tone as if talking to a friend.',
    professional: 'Maintain a polished, authoritative tone while remaining engaging and accessible.',
    humorous: 'Incorporate wit, jokes, and playful language while delivering the core message.',
    dramatic: 'Use dramatic pauses, emphasis, and emotional language to create impact.',
};

/**
 * Category-specific context prompts
 */
const CATEGORY_CONTEXT: Record<ContentCategory, string> = {
    technology: 'Focus on the tech innovation, impact on users, and future implications.',
    finance: 'Highlight the financial impact, market implications, and practical advice.',
    entertainment: 'Emphasize the entertainment value, cultural impact, and emotional connection.',
    gaming: 'Focus on gameplay mechanics, community reactions, and gaming culture references.',
    lifestyle: 'Provide practical value, personal connection, and actionable insights.',
    news: 'Present facts clearly, provide context, and maintain objectivity while being engaging.',
    drama: 'Build narrative tension, present multiple perspectives, and keep viewers hooked.',
    sports: 'Capture the excitement, highlight key moments, and connect to broader narratives.',
    science: 'Make complex topics accessible, use analogies, and spark curiosity.',
    other: 'Focus on the most engaging aspects and create a compelling narrative.',
};

/**
 * Few-shot examples for each category
 * These demonstrate ideal script structure and length (15-21s, ~40-52 words)
 */
const FEW_SHOT_EXAMPLES: Partial<Record<ContentCategory, string>> = {
    technology: `[HOOK]
Ring kapı zili sizi gizlice takip ediyor! [TEXT: "GİZLİ TAKİP"]

[BODY]
Flock güvenlik sistemi, kapınızın önündeki görüntüleri ICE'a gönderiyor. Mahallenizdeki her hareket kayıt altında. Güvenlik mi, gözetim mi?

[CTA]
Bunu herkes bilsin, paylaş!

[TITLE]
Kapı Ziliniz Sizi İzliyor 👁️

[HASHTAGS]
#teknoloji #gizlilik #güvenlik #viral`,

    finance: `[HOOK]
3 haftada emekli oldu, nasıl mı? [ZOOM IN]

[BODY]
GameStop hisseleri yine patladı. 10 dolarlık yatırım şimdi 10 bin dolar. Reddit yatırımcıları sistemi sarstı.

[CTA]
Yorumlara yaz, sen girdin mi?

[TITLE]
GameStop Yine Patladı 🚀

[HASHTAGS]
#borsa #yatırım #gamestop #finansal`,

    entertainment: `[HOOK]
Bu sahne interneti kırdı! [DRAMATIC PAUSE]

[BODY]
Yeni Marvel filmindeki plot twist kimseyi bırakmadı. Sosyal medya çöktü, herkes aynı şeyi konuşuyor.

[CTA]
İzledin mi? Yorum bırak!

[TITLE]
Marvel Herkesi Şoke Etti 🎬

[HASHTAGS]
#marvel #film #spoiler #viral`,

    gaming: `[HOOK]
Bu oyuncu tarihe geçti! [REPLAY]

[BODY]
Dünya şampiyonasında son saniye hamlesi. 1 vs 5 clutch, herkes ayakta. E-spor tarihinin en iyi anı.

[CTA]
Sen olsan ne yapardın?

[TITLE]
E-Spor Tarihinin En İyi Anı 🎮

[HASHTAGS]
#esports #gaming #clutch #viral`,
};

/**
 * Get few-shot example for a category
 * Falls back to technology example if category not found
 */
function getFewShotExample(category: ContentCategory): string {
    return FEW_SHOT_EXAMPLES[category] || FEW_SHOT_EXAMPLES.technology || '';
}

/**
 * Abstract Base Platform Agent
 *
 * All platform-specific agents must extend this class and implement
 * the abstract methods for platform-specific customization.
 */
export abstract class BasePlatformAgent implements PlatformAlgorithmExpert {
    /** Platform identifier */
    abstract readonly platform: Platform;

    /** Agent version for tracking */
    abstract readonly version: string;

    /** Logger instance */
    protected readonly logger;

    /** Platform algorithm focus configuration */
    protected readonly algorithmFocus: PlatformAlgorithmFocus;

    constructor() {
        // Logger will be initialized after subclass sets platform
        this.logger = createChildLogger('agent');
        this.algorithmFocus = PLATFORM_ALGORITHM_FOCUS[this.getPlatform()];
    }

    /**
     * Get platform (for constructor use before abstract property is available)
     */
    protected abstract getPlatform(): Platform;

    /**
     * Build platform-specific system instruction
     * This defines the AI's persona and expertise for the platform
     */
    protected abstract buildSystemPrompt(options: AgentOptions): string;

    /**
     * Build platform-specific content prompt
     * Adds platform-optimized instructions to the base prompt
     */
    protected abstract buildPlatformPrompt(trend: TrendData, options: AgentOptions): string;

    /**
     * Extract platform-specific optimizations applied
     * Returns a list of optimization descriptions for metadata
     */
    protected abstract getAppliedOptimizations(options: AgentOptions): string[];

    /**
     * Generate platform-specific hashtags if AI doesn't provide them
     */
    protected abstract generateDefaultHashtags(trend: TrendData): string[];

    /**
     * Main script generation method (Template Method pattern)
     */
    async generateScript(
        trend: TrendData,
        options: Partial<MultiPlatformOptions> = {}
    ): Promise<PlatformScript> {
        const opts: AgentOptions = {
            durationSeconds: options.durationSeconds ?? DEFAULT_AGENT_OPTIONS.durationSeconds,
            tone: options.tone ?? DEFAULT_AGENT_OPTIONS.tone,
            language: options.language ?? DEFAULT_AGENT_OPTIONS.language,
            includeHook: options.includeHook ?? DEFAULT_AGENT_OPTIONS.includeHook,
            includeCta: options.includeCta ?? DEFAULT_AGENT_OPTIONS.includeCta,
        };

        const gemini = getGeminiClient();

        if (!gemini.isConfigured()) {
            throw new GeminiError('Gemini API is not configured. Please set GEMINI_API_KEY.', undefined, false);
        }

        const systemPrompt = this.buildSystemPrompt(opts);
        const contentPrompt = this.buildContentPrompt(trend, opts);

        this.logger.info({
            platform: this.platform,
            trendId: trend.id,
            category: trend.category,
            duration: opts.durationSeconds,
        }, `[${this.platform}] Generating script`);

        const startTime = Date.now();

        try {
            const response = await gemini.generateContent(contentPrompt, {
                systemInstruction: systemPrompt,
                temperature: opts.tone === 'humorous' ? 0.9 : 0.7,
                maxTokens: 2048,
            });

            const script = this.parseResponse(response, trend, opts);

            const durationMs = Date.now() - startTime;
            this.logger.info({
                platform: this.platform,
                trendId: trend.id,
                durationMs,
                scriptLength: script.script.length,
                estimatedDuration: script.estimatedDurationSeconds,
            }, `[${this.platform}] Script generated successfully`);

            return script;

        } catch (error) {
            this.logger.error({
                platform: this.platform,
                error,
                trendId: trend.id,
            }, `[${this.platform}] Script generation failed`);
            throw error;
        }
    }

    /**
     * Build the complete content prompt
     * Combines base prompt with platform-specific additions
     */
    protected buildContentPrompt(trend: TrendData, options: AgentOptions): string {
        const langInstructions = LANGUAGE_INSTRUCTIONS[options.language];
        const platformLabel = PLATFORM_LABELS[this.platform];
        const algoFocus = this.algorithmFocus;

        const basePrompt = `
# Content Brief for ${platformLabel}

## Source Material
- **Title**: ${trend.title}
- **Source**: r/${trend.subreddit}
- **Category**: ${trend.category}
- **Engagement Score (NES)**: ${trend.nes.toFixed(1)}
- **Reddit Score**: ${trend.score.toLocaleString()}
- **Comments**: ${trend.numComments.toLocaleString()}
- **Link**: ${trend.permalink}

## ⚠️ STRICT DURATION & WORD COUNT LIMITS ⚠️
- **Target Duration**: ${options.durationSeconds} seconds
- **MAXIMUM Word Count**: ${Math.round(options.durationSeconds * 2.5)} words
- **THIS IS A HARD LIMIT. DO NOT EXCEED THIS WORD COUNT UNDER ANY CIRCUMSTANCES.**
- Platform optimal duration: ${algoFocus.optimalDuration.ideal}s (${Math.round(algoFocus.optimalDuration.ideal * 2.5)} words ideal)

⛔ CRITICAL: If you generate more than ${Math.round(options.durationSeconds * 2.5)} words TOTAL across all sections, the script will be TOO LONG.
✅ Write CONCISELY. Prioritize HIGH-IMPACT statements over length.
✅ Every word must earn its place. Cut unnecessary filler.

## Script Requirements
- **Platform**: ${platformLabel}
- **Tone**: ${options.tone}
- **Language**: ${langInstructions.name}

## Category Context
${CATEGORY_CONTEXT[trend.category]}

## Tone Instructions
${TONE_INSTRUCTIONS[options.tone]}

## Language Instructions
${langInstructions.instructions}

## Platform Algorithm Requirements
### ${platformLabel} Algorithm Focus
- **Primary Metrics**: ${algoFocus.primaryMetrics.join(', ')}
- **Hook Timing**: ${algoFocus.hookTiming.description} (First ${algoFocus.hookTiming.criticalSeconds}s critical)
- **Loop Strategy**: ${algoFocus.loopStrategy.description}
- **CTA Guidance**: ${algoFocus.ctaGuidance}
- **Optimal Duration**: ${algoFocus.optimalDuration.min}-${algoFocus.optimalDuration.max}s (ideal: ${algoFocus.optimalDuration.ideal}s)
- **Hashtag Strategy**: ${algoFocus.hashtagStrategy.count.min}-${algoFocus.hashtagStrategy.count.max} hashtags, ${algoFocus.hashtagStrategy.style}

## Structure Requirements (Stay within word limit!)
${options.includeHook ? '1. [HOOK] - MAXIMUM 8-12 words. Attention grabber.' : ''}
2. [BODY] - Main content. Use ${Math.round(options.durationSeconds * 2.5 * 0.7)} words maximum.
${options.includeCta ? '3. [CTA] - MAXIMUM 10-15 words. Clear call to action.' : ''}

## Output Format
Generate a complete, ready-to-read video script. Include:
1. [HOOK] section (if requested) - Keep it SHORT and punchy
2. [BODY] main content - CONCISE and impactful
3. [CTA] call to action (if requested) - Brief and clear
4. [TITLE] Suggested video title
5. [HASHTAGS] ${algoFocus.hashtagStrategy.count.min}-${algoFocus.hashtagStrategy.count.max} relevant hashtags

⚠️ FINAL REMINDER: Total script must be under ${Math.round(options.durationSeconds * 2.5)} words. Short-form content wins!
`;

        // Get few-shot example for this category
        const fewShotExample = getFewShotExample(trend.category);
        const fewShotSection = fewShotExample ? `
## 📝 REFERENCE EXAMPLE (Follow this structure and length!)
Below is an ideal 21-second script (~45 words). Match this format and brevity:

${fewShotExample}

---
⚠️ YOUR SCRIPT SHOULD BE SIMILAR IN LENGTH AND STRUCTURE.
` : '';

        // Add platform-specific prompt additions
        const platformPrompt = this.buildPlatformPrompt(trend, options);

        return basePrompt + '\n\n' + fewShotSection + '\n\n' + platformPrompt;
    }

    /**
     * Parse AI response into structured PlatformScript
     *
     * Uses newline-aware regex to properly handle nested brackets like [TEXT: "..."] or [ZOOM IN]
     * Enforces strict word limits via post-generation trimming.
     */
    protected parseResponse(
        response: string,
        trend: TrendData,
        options: AgentOptions
    ): PlatformScript {
        // Extract sections using newline-aware regex
        // Pattern: Look for section markers that appear at start of a line or after newline
        // This prevents false matches on inline markers like [TEXT: "..."] or [ZOOM IN]
        const hookMatch = response.match(/\[HOOK\]\s*([\s\S]*?)(?=\n\s*\[(?:BODY|CTA|TITLE|HASHTAGS)\]|$)/i);
        const bodyMatch = response.match(/\[BODY\]\s*([\s\S]*?)(?=\n\s*\[(?:CTA|TITLE|HASHTAGS)\]|$)/i);
        const ctaMatch = response.match(/\[CTA\]\s*([\s\S]*?)(?=\n\s*\[(?:TITLE|HASHTAGS)\]|$)/i);
        const titleMatch = response.match(/\[TITLE\]\s*([\s\S]*?)(?=\n\s*\[HASHTAGS\]|$)/i);
        const hashtagsMatch = response.match(/\[HASHTAGS\]\s*([\s\S]*?)$/i);

        // Clean and extract section content
        const hookText = this.cleanSectionContent(hookMatch?.[1] || '');
        const bodyText = this.cleanSectionContent(bodyMatch?.[1] || '') || this.cleanSectionContent(response);
        const ctaText = this.cleanSectionContent(ctaMatch?.[1] || '');
        const suggestedTitle = this.cleanSectionContent(titleMatch?.[1] || '') || trend.title;

        // Parse hashtags
        const hashtagsRaw = hashtagsMatch?.[1]?.trim() || '';
        const hashtags = hashtagsRaw
            .split(/[\s,]+/)
            .filter(tag => tag.startsWith('#') || tag.length > 0)
            .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
            .slice(0, this.algorithmFocus.hashtagStrategy.count.max);

        // Build initial sections - NO TRIMMING, AI should generate correct length
        const hookSection = hookText ? this.createSection(hookText) : undefined;
        const bodySection = this.createSection(bodyText);
        const ctaSection = ctaText ? this.createSection(ctaText) : undefined;

        // Build complete script from sections
        const fullScript = [
            hookSection?.content,
            bodySection.content,
            ctaSection?.content
        ].filter(Boolean).join('\n\n');

        // Calculate total duration from sections
        const totalWords = (hookSection?.wordCount || 0) + bodySection.wordCount + (ctaSection?.wordCount || 0);
        const estimatedDuration = Math.round(totalWords / 2.5);

        // Collect warnings - only for genuinely problematic content
        const warnings: string[] = [];

        // Check for incomplete sections (after trimming)
        if (hookSection && !this.validateSectionCompleteness(hookSection)) {
            warnings.push('Hook bölümü tamamlanmamış görünüyor');
        }
        if (!this.validateSectionCompleteness(bodySection)) {
            warnings.push('Body bölümü tamamlanmamış görünüyor');
        }
        if (ctaSection && !this.validateSectionCompleteness(ctaSection)) {
            warnings.push('CTA bölümü tamamlanmamış görünüyor');
        }

        // Check for abnormally short content
        if (totalWords < 15) {
            warnings.push('Script çok kısa - AI yanıtı eksik olabilir');
        }

        return {
            platform: this.platform,
            script: fullScript,
            title: suggestedTitle.replace(/^["']|["']$/g, '').trim(),
            hashtags: hashtags.length > 0 ? hashtags : this.generateDefaultHashtags(trend),
            estimatedDurationSeconds: estimatedDuration,
            sections: {
                hook: hookSection,
                body: bodySection,
                cta: ctaSection,
            },
            optimizations: this.getAppliedOptimizations(options),
            metadata: {
                generatedAt: new Date().toISOString(),
                trendId: trend.id,
                category: trend.category,
                agentVersion: this.version,
            },
            warnings: warnings.length > 0 ? warnings : undefined,
        };
    }

    /**
     * Clean section content by removing markdown artifacts and excess whitespace
     */
    protected cleanSectionContent(content: string): string {
        return content
            // Remove markdown bold/italic markers (**, ***, *)
            .replace(/^\*{1,3}\s*|\s*\*{1,3}$/gm, '')
            // Remove orphaned markdown markers in the middle
            .replace(/\*{2,}/g, '')
            // Normalize whitespace - collapse multiple newlines
            .replace(/\n{3,}/g, '\n\n')
            // Remove leading/trailing whitespace from each line
            .split('\n')
            .map(line => line.trim())
            .join('\n')
            // Final trim
            .trim();
    }

    /**
     * Validate if a section appears to be complete (ends with punctuation)
     */
    protected validateSectionCompleteness(section: ScriptSection): boolean {
        const content = section.content.trim();
        // Check if content ends with proper punctuation
        const endsWithPunctuation = /[.!?…"']$/.test(content);
        // Check minimum word count (very short sections are suspicious)
        const hasMinimumWords = section.wordCount >= 5;
        // Check if last word appears truncated (ends with letters, no punctuation)
        const lastWord = content.split(/\s+/).pop() || '';
        const lastWordTruncated = /^[a-zA-ZçğıöşüÇĞİÖŞÜ]+$/.test(lastWord) && lastWord.length > 2;

        // Section is complete if it ends with punctuation OR has minimum words and doesn't look truncated
        return endsWithPunctuation || (hasMinimumWords && !lastWordTruncated);
    }

    /**
     * Enforce word limit on a section by trimming content
     * 
     * Tries to trim at sentence boundaries for cleaner results.
     * If no sentence boundary found, trims at word boundary and adds ellipsis.
     */
    protected enforceWordLimit(
        section: ScriptSection,
        maxWords: number
    ): { section: ScriptSection; wasTrimmed: boolean } {
        if (section.wordCount <= maxWords) {
            return { section, wasTrimmed: false };
        }

        const content = section.content;
        const words = content.split(/\s+/);

        // Take only maxWords
        const trimmedWords = words.slice(0, maxWords);
        let trimmedContent = trimmedWords.join(' ');

        // Try to find a sentence boundary within the trimmed content
        // Look for last complete sentence (ends with . ! ? ...)
        const sentenceEndMatch = trimmedContent.match(/^([\s\S]*[.!?…])\s*[^.!?…]*$/);

        if (sentenceEndMatch && sentenceEndMatch[1].split(/\s+/).length >= Math.floor(maxWords * 0.5)) {
            // We found a sentence boundary that keeps at least 50% of allowed words
            trimmedContent = sentenceEndMatch[1].trim();
        } else {
            // No good sentence boundary, just add ellipsis
            trimmedContent = trimmedContent.trim();
            // Clean trailing punctuation if incomplete
            trimmedContent = trimmedContent.replace(/[,;:]$/, '');
            trimmedContent += '...';
        }

        return {
            section: this.createSection(trimmedContent),
            wasTrimmed: true,
        };
    }

    /**
     * Create a section with word count and duration metadata
     */
    protected createSection(content: string): ScriptSection {
        const cleanedContent = this.cleanSectionContent(content);
        const wordCount = cleanedContent.split(/\s+/).filter(Boolean).length;
        return {
            content: cleanedContent,
            wordCount,
            estimatedSeconds: Math.round(wordCount / 2.5),
        };
    }

    /**
     * Get platform display name
     */
    getPlatformLabel(): string {
        return PLATFORM_LABELS[this.platform];
    }

    /**
     * Get algorithm focus configuration
     */
    getAlgorithmFocus(): PlatformAlgorithmFocus {
        return this.algorithmFocus;
    }

    /**
     * Get optimal duration range for this platform
     */
    getOptimalDuration(): { min: number; max: number; ideal: number } {
        return this.algorithmFocus.optimalDuration;
    }

    /**
     * Get platform-specific visual style guide
     * Each platform agent must implement this to define its visual aesthetic
     */
    abstract getVisualStyle(): VisualStyle;

    /**
     * Get platform-specific audio recommendations
     * Each platform agent must implement this to define its audio style
     */
    abstract getAudioStyle(): AudioStyle;
}
