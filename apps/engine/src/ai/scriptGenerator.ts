/**
 * Script Generator Service
 * 
 * Generates video scripts from trend data using Gemini AI.
 * Supports multiple content formats and category-specific prompts.
 * 
 * @module ai/scriptGenerator
 */

import type { TrendData, ContentCategory } from '@icerik/shared';
import { CATEGORY_VIDEO_FORMATS } from '@icerik/shared';
import { getGeminiClient, GeminiError } from './gemini.js';
import { sanitizeScriptText } from './scriptSanitizer.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('scriptGenerator');

/**
 * Video format types
 */
export type VideoFormat =
    | 'Explainer'
    | 'News Commentary'
    | 'Review'
    | 'Hot Take'
    | 'Analysis'
    | 'Recreation'
    | 'Commentary'
    | 'Reaction'
    | 'Tips'
    | 'How-To'
    | 'Story-time'
    | 'Highlights'
    | 'Deep Dive';

/**
 * Script generation options
 */
export interface ScriptOptions {
    /** Video format type */
    format: VideoFormat;
    /** Target duration in seconds */
    durationSeconds: number;
    /** Target platform */
    platform: 'tiktok' | 'reels' | 'shorts' | 'all';
    /** Tone of the script */
    tone: 'casual' | 'professional' | 'humorous' | 'dramatic';
    /** Language for the script */
    language: 'en' | 'tr';
    /** Include call to action */
    includeCta: boolean;
    /** Include hook at the start */
    includeHook: boolean;
}

/**
 * Generated script output
 */
export interface GeneratedScript {
    /** The generated script text */
    script: string;
    /** Suggested title */
    title: string;
    /** Suggested hashtags */
    hashtags: string[];
    /** Estimated reading time in seconds */
    estimatedDurationSeconds: number;
    /** Script sections */
    sections: {
        hook?: string;
        body: string;
        cta?: string;
    };
    /** Metadata */
    metadata: {
        format: VideoFormat;
        platform: string;
        generatedAt: string;
        trendId: string;
        category: ContentCategory;
    };
}

/**
 * Default script options
 */
const DEFAULT_OPTIONS: ScriptOptions = {
    format: 'Commentary',
    durationSeconds: 60,
    platform: 'all',
    tone: 'casual',
    language: 'tr',
    includeCta: true,
    includeHook: true,
};

/**
 * Category-specific prompt enhancements
 */
const CATEGORY_PROMPTS: Record<ContentCategory, string> = {
    technology: 'Focus on the tech innovation, impact on users, and future implications. Use clear explanations for technical concepts.',
    finance: 'Highlight the financial impact, market implications, and practical advice. Be informative yet engaging.',
    entertainment: 'Emphasize the entertainment value, cultural impact, and emotional connection. Keep it fun and relatable.',
    gaming: 'Focus on gameplay mechanics, community reactions, and gaming culture references. Use appropriate gaming terminology.',
    lifestyle: 'Provide practical value, personal connection, and actionable insights. Be relatable and inspiring.',
    news: 'Present facts clearly, provide context, and maintain objectivity while being engaging.',
    drama: 'Build narrative tension, present multiple perspectives, and keep viewers hooked. Use storytelling techniques.',
    sports: 'Capture the excitement, highlight key moments, and connect to broader narratives. Be energetic.',
    science: 'Make complex topics accessible, use analogies, and spark curiosity. Be educational yet entertaining.',
    other: 'Focus on the most engaging aspects and create a compelling narrative.',
};

/**
 * Platform-specific guidelines
 */
const PLATFORM_GUIDELINES: Record<ScriptOptions['platform'], string> = {
    tiktok: 'Optimize for TikTok: Fast-paced, trendy language, use of trends and challenges, strong visual cues in script.',
    reels: 'Optimize for Instagram Reels: Polished presentation, aesthetic focus, lifestyle appeal, strong visual descriptions.',
    shorts: 'Optimize for YouTube Shorts: Clear value proposition, educational or entertaining, subscribe prompts.',
    all: 'Create versatile content suitable for all short-form platforms.',
};

/**
 * Tone adjustments
 */
const TONE_INSTRUCTIONS: Record<ScriptOptions['tone'], string> = {
    casual: 'Use conversational language, contractions, and a friendly tone as if talking to a friend.',
    professional: 'Maintain a polished, authoritative tone while remaining engaging and accessible.',
    humorous: 'Incorporate wit, jokes, and playful language while delivering the core message.',
    dramatic: 'Use dramatic pauses, emphasis, and emotional language to create impact.',
};

/**
 * Language-specific instructions
 */
const LANGUAGE_INSTRUCTIONS: Record<ScriptOptions['language'], { name: string; instructions: string }> = {
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
 * Script Generator Class
 */
export class ScriptGenerator {
    /**
     * Generates a video script from trend data
     * @param trend - The trend to generate a script for
     * @param options - Script generation options
     * @returns Generated script with metadata
     */
    async generateScript(
        trend: TrendData,
        options: Partial<ScriptOptions> = {}
    ): Promise<GeneratedScript> {
        const opts = { ...DEFAULT_OPTIONS, ...options };
        const gemini = getGeminiClient();

        if (!gemini.isConfigured()) {
            throw new GeminiError('Gemini API is not configured. Please set GEMINI_API_KEY.', undefined, false);
        }

        const prompt = this.buildPrompt(trend, opts);
        const systemInstruction = this.buildSystemInstruction(opts);

        logger.info({
            trendId: trend.id,
            category: trend.category,
            format: opts.format,
            platform: opts.platform,
        }, 'Generating script');

        try {
            const response = await gemini.generateContent(prompt, {
                systemInstruction,
                temperature: opts.tone === 'humorous' ? 0.9 : 0.7,
                maxTokens: 2048,
            });

            const script = this.parseResponse(response, trend, opts);

            logger.info({
                trendId: trend.id,
                scriptLength: script.script.length,
                estimatedDuration: script.estimatedDurationSeconds,
            }, 'Script generated successfully');

            return script;

        } catch (error) {
            logger.error({ error, trendId: trend.id }, 'Script generation failed');
            throw error;
        }
    }

    /**
     * Builds the main prompt for script generation
     */
    private buildPrompt(trend: TrendData, options: ScriptOptions): string {
        const langInstructions = LANGUAGE_INSTRUCTIONS[options.language];

        return `
# Content Brief

## Source Material
- **Title**: ${trend.title}
- **Source**: r/${trend.subreddit}
- **Category**: ${trend.category}
- **Engagement Score (NES)**: ${trend.nes.toFixed(1)}
- **Reddit Score**: ${trend.score.toLocaleString()}
- **Comments**: ${trend.numComments.toLocaleString()}
- **Link**: ${trend.permalink}

## Script Requirements
- **Format**: ${options.format}
- **Target Duration**: ${options.durationSeconds} seconds (approximately ${Math.round(options.durationSeconds * 2.5)} words)
- **Platform**: ${options.platform}
- **Tone**: ${options.tone}
- **Language**: ${langInstructions.name}

## Category Context
${CATEGORY_PROMPTS[trend.category]}

## Platform Guidelines
${PLATFORM_GUIDELINES[options.platform]}

## Tone Instructions
${TONE_INSTRUCTIONS[options.tone]}

## Language Instructions
${langInstructions.instructions}

## Structure Requirements
${options.includeHook ? '1. Start with a compelling HOOK (first 3 seconds crucial)' : ''}
2. Deliver the main content with clear sections
${options.includeCta ? '3. End with a clear CALL TO ACTION' : ''}

## Output Format
Generate a complete, ready-to-read video script. Include:
1. [HOOK] section (if requested)
2. [BODY] main content
3. [CTA] call to action (if requested)
4. Suggested TITLE for the video
5. 5-7 relevant HASHTAGS

Make it viral-worthy and perfectly suited for short-form content.
`;
    }

    /**
     * Builds system instruction for consistent behavior
     */
    private buildSystemInstruction(options: ScriptOptions): string {
        return `You are a professional short-form video content creator and scriptwriter. 
Your scripts are known for going viral on ${options.platform === 'all' ? 'TikTok, Instagram Reels, and YouTube Shorts' : options.platform}.

Key principles:
- Every second counts in short-form content
- Hook viewers in the first 3 seconds
- Use pattern interrupts to maintain attention
- End with clear value or call to action
- Write scripts that are easy to perform on camera

CRITICAL: Do NOT include visual directions, camera cues, or editing notes in the script text.
Examples of what NOT to include: [ZOOM IN], [ZOOM OUT], [CUT TO], [B-ROLL], [PAUSE], [TRANSITION], [SFX], [MUSIC], [VISUAL], [OVERLAY].
The script is for SPOKEN narration only. Visual editing notes should NOT be part of the script.
Write pure dialogue/narration that will be read aloud by a voice-over artist.

You always format your response with clear [HOOK], [BODY], [CTA], [TITLE], and [HASHTAGS] sections.`;
    }

    /**
     * Parses AI response into structured script format
     */
    private parseResponse(
        response: string,
        trend: TrendData,
        options: ScriptOptions
    ): GeneratedScript {
        // Extract sections using regex
        const hookMatch = response.match(/\[HOOK\]([\s\S]*?)(?=\[BODY\]|\[CTA\]|$)/i);
        const bodyMatch = response.match(/\[BODY\]([\s\S]*?)(?=\[CTA\]|\[TITLE\]|$)/i);
        const ctaMatch = response.match(/\[CTA\]([\s\S]*?)(?=\[TITLE\]|\[HASHTAGS\]|$)/i);
        const titleMatch = response.match(/\[TITLE\]([\s\S]*?)(?=\[HASHTAGS\]|$)/i);
        const hashtagsMatch = response.match(/\[HASHTAGS\]([\s\S]*?)$/i);

        // Sanitize each section to remove ALL bracket annotations
        // This removes [ZOOM IN], [TEXT: "..."], [TRANSITION: ...], etc.
        const hook = sanitizeScriptText(hookMatch?.[1]?.trim() || '');
        const body = sanitizeScriptText(bodyMatch?.[1]?.trim() || response.trim());
        const cta = sanitizeScriptText(ctaMatch?.[1]?.trim() || '');
        const suggestedTitle = titleMatch?.[1]?.trim() || trend.title;

        // Parse hashtags
        const hashtagsText = hashtagsMatch?.[1]?.trim() || '';
        const hashtags = hashtagsText
            .split(/[\s,]+/)
            .filter(tag => tag.startsWith('#') || tag.length > 0)
            .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
            .slice(0, 7);

        // Build complete script (already sanitized)
        const fullScript = [hook, body, cta].filter(Boolean).join('\n\n');

        // Estimate duration (average speaking rate: ~2.5 words per second)
        const wordCount = fullScript.split(/\s+/).length;
        const estimatedDuration = Math.round(wordCount / 2.5);

        return {
            script: fullScript,
            title: suggestedTitle.replace(/^["']|["']$/g, '').trim(),
            hashtags: hashtags.length > 0 ? hashtags : this.generateDefaultHashtags(trend),
            estimatedDurationSeconds: estimatedDuration,
            sections: {
                hook: hook || undefined,
                body,
                cta: cta || undefined,
            },
            metadata: {
                format: options.format,
                platform: options.platform,
                generatedAt: new Date().toISOString(),
                trendId: trend.id,
                category: trend.category,
            },
        };
    }

    /**
     * Generates default hashtags if AI doesn't provide them
     */
    private generateDefaultHashtags(trend: TrendData): string[] {
        const categoryHashtags: Record<ContentCategory, string[]> = {
            technology: ['#tech', '#technology', '#innovation', '#future'],
            finance: ['#finance', '#money', '#investing', '#business'],
            entertainment: ['#entertainment', '#trending', '#viral', '#pop'],
            gaming: ['#gaming', '#gamer', '#games', '#esports'],
            lifestyle: ['#lifestyle', '#tips', '#life', '#motivation'],
            news: ['#news', '#breaking', '#world', '#today'],
            drama: ['#drama', '#story', '#storytime', '#tea'],
            sports: ['#sports', '#athlete', '#game', '#win'],
            science: ['#science', '#facts', '#learn', '#education'],
            other: ['#trending', '#viral', '#fyp', '#foryou'],
        };

        return [
            ...categoryHashtags[trend.category],
            `#${trend.subreddit.toLowerCase()}`,
            '#fyp',
            '#foryou',
        ].slice(0, 7);
    }

    /**
     * Gets available formats for a category
     */
    getFormatsForCategory(category: ContentCategory): VideoFormat[] {
        return CATEGORY_VIDEO_FORMATS[category] as VideoFormat[];
    }

    /**
     * Validates script options
     */
    validateOptions(options: Partial<ScriptOptions>): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (options.durationSeconds !== undefined) {
            if (options.durationSeconds < 15 || options.durationSeconds > 180) {
                errors.push('Duration must be between 15 and 180 seconds');
            }
        }

        if (options.format !== undefined) {
            const validFormats: VideoFormat[] = [
                'Explainer', 'News Commentary', 'Review', 'Hot Take', 'Analysis',
                'Recreation', 'Commentary', 'Reaction', 'Tips', 'How-To',
                'Story-time', 'Highlights', 'Deep Dive'
            ];
            if (!validFormats.includes(options.format)) {
                errors.push(`Invalid format: ${options.format}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }
}

/**
 * Singleton instance
 */
let generatorInstance: ScriptGenerator | null = null;

/**
 * Gets the singleton ScriptGenerator
 */
export function getScriptGenerator(): ScriptGenerator {
    if (!generatorInstance) {
        generatorInstance = new ScriptGenerator();
    }
    return generatorInstance;
}

/**
 * Resets the generator instance (for testing)
 */
export function resetScriptGenerator(): void {
    generatorInstance = null;
}
