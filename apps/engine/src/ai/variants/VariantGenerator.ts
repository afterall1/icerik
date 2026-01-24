/**
 * Variant Generator Module
 *
 * Generates multiple script variants for A/B testing.
 * Each variant uses a different style/approach for the same content.
 *
 * @module ai/variants/VariantGenerator
 */

import type { TrendData, AlgorithmScore } from '@icerik/shared';
import type { Platform, PlatformScript } from '@icerik/shared';
import { PLATFORM_ALGORITHM_FOCUS, PLATFORM_LABELS } from '@icerik/shared';
import { createChildLogger } from '../../utils/logger.js';
import { getAIMetrics } from '../metrics/index.js';
import { getAlgorithmScorer } from '../scoring/index.js';
import { getGeminiClient, GeminiError } from '../gemini.js';
import { compilePlatformKnowledge } from '../knowledge/index.js';

const logger = createChildLogger('variantGenerator');

/**
 * Script variant styles for A/B testing (local definition)
 */
export type VariantStyle =
    | 'high_energy'    // Fast-paced, quick cuts, dynamic
    | 'story_driven'   // Narrative arc, emotional journey
    | 'controversial'  // Debate-starter, hot take, opinion
    | 'educational'    // Explainer, tutorial, informative
    | 'reaction';      // Reaction-style, commentary, humor

/**
 * Variant generation options (local definition)
 */
export interface VariantGenerationOptions {
    styles: VariantStyle[];
    durationSeconds?: number;
    tone?: 'casual' | 'professional' | 'humorous' | 'dramatic';
    language?: 'en' | 'tr';
    calculateScores?: boolean;
}

/**
 * Script variant with PlatformScript (local definition)
 */
export interface ScriptVariantWithScript {
    variantId: string;
    style: VariantStyle;
    script: PlatformScript;
    algorithmScore?: AlgorithmScore;
    differentiator: string;
}

/**
 * Style-specific instructions for variant generation
 */
const STYLE_INSTRUCTIONS: Record<VariantStyle, {
    name: string;
    description: string;
    promptAdditions: string;
}> = {
    high_energy: {
        name: 'High Energy',
        description: 'Fast-paced, dynamic, quick cuts',
        promptAdditions: `
STYLE: HIGH ENERGY
- Fast-paced delivery, punchy sentences
- Quick transitions between points
- High-impact visuals (mark with [CUT], [ZOOM], [FLASH])
- Energetic, urgent tone
- Pattern interrupts every 2-3 seconds
- Short sentences (5-8 words max)
- Use exclamations and emphasis
`,
    },

    story_driven: {
        name: 'Story Driven',
        description: 'Narrative arc, emotional journey',
        promptAdditions: `
STYLE: STORY DRIVEN
- Build a narrative arc (setup → tension → resolution)
- Create emotional connection with viewer
- Use personal pronouns and relatable scenarios
- Build suspense before the payoff
- Include a twist or unexpected element
- Conversational, intimate tone
- Let the story unfold naturally
`,
    },

    controversial: {
        name: 'Controversial',
        description: 'Debate-starter, hot take, opinion',
        promptAdditions: `
STYLE: CONTROVERSIAL
- Open with a bold, divisive statement
- Take a clear stance on the topic
- Anticipate and address counterarguments
- Use rhetorical questions to engage
- End with a question to drive comments
- Provocative but not offensive
- Encourage viewers to share their opinion
`,
    },

    educational: {
        name: 'Educational',
        description: 'Explainer, tutorial, informative',
        promptAdditions: `
STYLE: EDUCATIONAL
- Clear, structured explanation
- Use "Here's what you need to know" framing
- Break complex topics into simple steps
- Include numbers or statistics for credibility
- Use analogies to explain concepts
- "Most people don't know this" hook
- Provide actionable takeaways
`,
    },

    reaction: {
        name: 'Reaction',
        description: 'Reaction-style, commentary, humor',
        promptAdditions: `
STYLE: REACTION
- Personal commentary throughout
- Express genuine reactions and emotions
- Mix humor with insights
- Use "I can't believe..." or "Wait, what?" moments
- Include asides to the viewer
- Relatable, authentic voice
- End with your verdict/opinion
`,
    },
};

/**
 * Variant generation result
 */
export interface VariantGenerationResult {
    /** Source trend */
    trend: TrendData;
    /** Target platform */
    platform: Platform;
    /** Generated variants */
    variants: ScriptVariantWithScript[];
    /** Recommended variant ID */
    recommended: string;
    /** Generation metadata */
    metadata: {
        generatedAt: string;
        totalDurationMs: number;
        variantCount: number;
    };
}

/**
 * Variant Generator
 *
 * Generates multiple script variants with different styles.
 */
export class VariantGenerator {
    /**
     * Generate multiple script variants
     */
    async generateVariants(
        trend: TrendData,
        platform: Platform,
        options: VariantGenerationOptions = { styles: ['high_energy', 'story_driven'] }
    ): Promise<VariantGenerationResult> {
        const metrics = getAIMetrics();
        const operationId = metrics.startOperation('generate_variants', {
            platform,
            category: trend.category,
        });

        const startTime = Date.now();
        const styles: VariantStyle[] = options.styles.length > 0
            ? options.styles
            : ['high_energy', 'story_driven'] as VariantStyle[];

        logger.info({
            trendId: trend.id,
            platform,
            styles,
        }, 'Starting variant generation');

        try {
            const gemini = getGeminiClient();

            if (!gemini.isConfigured()) {
                throw new GeminiError('Gemini API is not configured', undefined, false);
            }

            // Generate variants in parallel
            const variantPromises = styles.map(style =>
                this.generateSingleVariant(trend, platform, style, options)
            );

            const results = await Promise.allSettled(variantPromises);

            // Collect successful variants
            const variants: ScriptVariantWithScript[] = [];

            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                if (result.status === 'fulfilled') {
                    variants.push(result.value);
                } else {
                    logger.error({
                        style: styles[i],
                        error: result.reason,
                    }, 'Variant generation failed');
                }
            }

            if (variants.length === 0) {
                throw new Error('All variant generations failed');
            }

            // Calculate scores if requested
            if (options.calculateScores) {
                await this.scoreVariants(variants, platform);
            }

            // Determine recommended variant
            const recommended = this.selectRecommendedVariant(variants);

            const totalDurationMs = Date.now() - startTime;

            metrics.endOperation(operationId, {
                success: true,
                promptTokens: variants.length * 800,  // Estimate
                responseTokens: variants.length * 400,
            });

            logger.info({
                trendId: trend.id,
                platform,
                variantCount: variants.length,
                recommended,
                totalDurationMs,
            }, 'Variant generation completed');

            return {
                trend,
                platform,
                variants,
                recommended,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    totalDurationMs,
                    variantCount: variants.length,
                },
            };
        } catch (error) {
            metrics.endOperation(operationId, {
                success: false,
                errorType: error instanceof Error ? error.name : 'unknown',
                errorMessage: error instanceof Error ? error.message : String(error),
            });

            logger.error({
                trendId: trend.id,
                platform,
                error,
            }, 'Variant generation failed');

            throw error;
        }
    }

    /**
     * Generate a single variant
     */
    private async generateSingleVariant(
        trend: TrendData,
        platform: Platform,
        style: VariantStyle,
        options: VariantGenerationOptions
    ): Promise<ScriptVariantWithScript> {
        const gemini = getGeminiClient();
        const styleConfig = STYLE_INSTRUCTIONS[style];
        const algoFocus = PLATFORM_ALGORITHM_FOCUS[platform];
        const platformKnowledge = compilePlatformKnowledge(platform);

        const durationSeconds = options.durationSeconds ?? algoFocus.optimalDuration.ideal;
        const maxWords = Math.round(durationSeconds * 2.5);

        const prompt = `
# ${styleConfig.name} Script for ${PLATFORM_LABELS[platform]}

## Source Material
- **Title**: ${trend.title}
- **Source**: r/${trend.subreddit}
- **Category**: ${trend.category}
- **NES Score**: ${trend.nes.toFixed(1)}

## STRICT LIMITS
- **Duration**: ${durationSeconds} seconds
- **Max Words**: ${maxWords} words

## Platform Knowledge
${platformKnowledge.slice(0, 2000)}

## Style Requirements
${styleConfig.promptAdditions}

## Output Format
Generate a complete script with:
1. [HOOK] - Attention grabber (under 10 words)
2. [BODY] - Main content in ${styleConfig.name} style
3. [CTA] - Call to action
4. [TITLE] - Video title
5. [HASHTAGS] - ${algoFocus.hashtagStrategy.count.min}-${algoFocus.hashtagStrategy.count.max} hashtags

Language: Turkish (Türkçe)
Tone: ${options.tone ?? 'casual'}
`;

        const systemPrompt = `You are a ${PLATFORM_LABELS[platform]} content expert specializing in ${styleConfig.name} content.
Your scripts are optimized for ${algoFocus.primaryMetrics.join(', ')}.
Always output in Turkish. Be concise and impactful.`;

        const response = await gemini.generateContent(prompt, {
            systemInstruction: systemPrompt,
            temperature: 0.85,
            maxTokens: 2048,
        });

        const script = this.parseVariantResponse(
            response,
            trend,
            platform,
            style,
            durationSeconds
        );

        return {
            variantId: `${style}_${Date.now()}`,
            style,
            script,
            differentiator: styleConfig.description,
        };
    }

    /**
     * Parse variant response into PlatformScript
     */
    private parseVariantResponse(
        response: string,
        trend: TrendData,
        platform: Platform,
        style: VariantStyle,
        durationSeconds: number
    ): PlatformScript {
        const hookMatch = response.match(/\[HOOK\]\s*([\s\S]*?)(?=\[BODY\])/i);
        const bodyMatch = response.match(/\[BODY\]\s*([\s\S]*?)(?=\[CTA\])/i);
        const ctaMatch = response.match(/\[CTA\]\s*([\s\S]*?)(?=\[TITLE\])/i);
        const titleMatch = response.match(/\[TITLE\]\s*([\s\S]*?)(?=\[HASHTAGS\])/i);
        const hashtagsMatch = response.match(/\[HASHTAGS\]\s*([\s\S]*?)$/i);

        const hook = hookMatch?.[1]?.trim() ?? '';
        const body = bodyMatch?.[1]?.trim() ?? '';
        const cta = ctaMatch?.[1]?.trim() ?? '';
        const title = titleMatch?.[1]?.trim() ?? `${trend.title} - ${style}`;

        const hashtags = hashtagsMatch?.[1]
            ?.match(/#[\wğüşöçıİ]+/gi)
            ?.slice(0, 10) ?? this.generateDefaultHashtags(trend, platform);

        const hookWords = hook.split(/\s+/).length;
        const bodyWords = body.split(/\s+/).length;
        const ctaWords = cta.split(/\s+/).length;
        const totalWords = hookWords + bodyWords + ctaWords;

        return {
            platform,
            script: `[HOOK]\n${hook}\n\n[BODY]\n${body}\n\n[CTA]\n${cta}`,
            title,
            hashtags,
            estimatedDurationSeconds: Math.round(totalWords / 2.5) || durationSeconds,
            sections: {
                hook: {
                    content: hook,
                    wordCount: hookWords,
                    estimatedSeconds: Math.round(hookWords / 2.5),
                },
                body: {
                    content: body,
                    wordCount: bodyWords,
                    estimatedSeconds: Math.round(bodyWords / 2.5),
                },
                cta: {
                    content: cta,
                    wordCount: ctaWords,
                    estimatedSeconds: Math.round(ctaWords / 2.5),
                },
            },
            optimizations: [
                `${STYLE_INSTRUCTIONS[style].name} style applied`,
                `Optimized for ${PLATFORM_LABELS[platform]}`,
            ],
            metadata: {
                generatedAt: new Date().toISOString(),
                trendId: trend.id,
                category: trend.category,
                agentVersion: 'VariantGenerator-1.0.0',
            },
        };
    }

    /**
     * Score all variants
     */
    private async scoreVariants(
        variants: ScriptVariantWithScript[],
        platform: Platform
    ): Promise<void> {
        const scorer = getAlgorithmScorer();

        for (const variant of variants) {
            try {
                const score = scorer.score(variant.script);
                variant.algorithmScore = score;
            } catch (error) {
                logger.warn({
                    variantId: variant.variantId,
                    error,
                }, 'Failed to score variant');
            }
        }
    }

    /**
     * Select the recommended variant based on scores
     */
    private selectRecommendedVariant(variants: ScriptVariantWithScript[]): string {
        if (variants.length === 0) {
            return '';
        }

        // If scores are available, use them
        const scoredVariants = variants.filter(v => v.algorithmScore);
        if (scoredVariants.length > 0) {
            scoredVariants.sort((a, b) =>
                (b.algorithmScore?.overallScore ?? 0) - (a.algorithmScore?.overallScore ?? 0)
            );
            return scoredVariants[0].variantId;
        }

        // Default to first variant
        return variants[0].variantId;
    }

    /**
     * Generate default hashtags
     */
    private generateDefaultHashtags(trend: TrendData, platform: Platform): string[] {
        const base = ['#viral', '#fyp', '#trending'];
        const category = `#${trend.category}`;
        const subreddit = `#${trend.subreddit.replace(/[^a-zA-Z0-9]/g, '')}`;

        if (platform === 'tiktok') {
            return [...base, category, subreddit, '#tiktok'];
        } else if (platform === 'reels') {
            return [...base, category, subreddit, '#reels', '#instagram'];
        } else {
            return [...base, category, subreddit, '#shorts', '#youtube'];
        }
    }
}

// ============================================================
// Singleton Instance
// ============================================================

let generatorInstance: VariantGenerator | null = null;

/**
 * Get the singleton VariantGenerator instance
 */
export function getVariantGenerator(): VariantGenerator {
    if (!generatorInstance) {
        generatorInstance = new VariantGenerator();
    }
    return generatorInstance;
}

/**
 * Reset the generator instance (for testing)
 */
export function resetVariantGenerator(): void {
    generatorInstance = null;
}
