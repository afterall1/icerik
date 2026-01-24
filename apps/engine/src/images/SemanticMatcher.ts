/**
 * SemanticMatcher Module
 * 
 * Uses Gemini AI to generate optimal visual search queries for each scene.
 * Understands scene semantics and recommends video vs image.
 * 
 * @module images/SemanticMatcher
 */

import { getEnv } from '../utils/env.js';
import type { Scene, SceneAnalysis, SceneMood } from './SceneAnalyzer.js';
import type { ValidatedImage } from './ImageSearchService.js';

/**
 * Gemini API Configuration
 */
const GEMINI_CONFIG = {
    BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
    MODEL: 'gemini-2.0-flash',
    TIMEOUT_MS: 30000,
} as const;

/**
 * Visual query for a scene
 */
export interface VisualQuery {
    /** Reference to scene ID */
    sceneId: string;
    /** Primary search query */
    primaryQuery: string;
    /** Fallback queries if primary fails */
    secondaryQueries: string[];
    /** Target mood for visual */
    mood: SceneMood;
    /** Whether video is preferred for this scene */
    preferVideo: boolean;
    /** Visual style hints */
    styleHints: string[];
    /** Colors that match scene mood */
    suggestedColors: string[];
}

/**
 * Match result for a scene
 */
export interface MatchResult {
    /** Scene ID */
    sceneId: string;
    /** Selected visual */
    selectedVisual: ValidatedImage;
    /** Match quality score (0-100) */
    matchScore: number;
    /** Why this visual matches */
    matchReason: string;
    /** Alternative visuals */
    alternatives: ValidatedImage[];
}

/**
 * Query generation result
 */
export interface QueryGenerationResult {
    /** Generated queries per scene */
    queries: VisualQuery[];
    /** Overall theme query for coherence */
    themeQuery: string;
    /** Suggested color palette */
    colorPalette: string[];
    /** Generation metadata */
    metadata: {
        generatedAt: string;
        modelUsed: string;
        processingTimeMs: number;
    };
}

/**
 * Configuration for semantic matching
 */
export interface SemanticMatcherOptions {
    /** Include style hints in queries */
    includeStyleHints?: boolean;
    /** Include color suggestions */
    includeColors?: boolean;
    /** Prefer videos for action scenes */
    preferVideosForAction?: boolean;
}

const DEFAULT_OPTIONS: Required<SemanticMatcherOptions> = {
    includeStyleHints: true,
    includeColors: true,
    preferVideosForAction: true,
};

/**
 * Mood to visual style mapping
 */
const MOOD_VISUAL_STYLES: Record<SceneMood, { styles: string[]; colors: string[] }> = {
    energetic: {
        styles: ['dynamic', 'action', 'motion blur', 'vibrant'],
        colors: ['red', 'orange', 'yellow', 'bright'],
    },
    calm: {
        styles: ['peaceful', 'minimal', 'soft light', 'pastel'],
        colors: ['blue', 'green', 'white', 'soft'],
    },
    dramatic: {
        styles: ['high contrast', 'shadows', 'cinematic', 'dark'],
        colors: ['black', 'red', 'gold', 'deep blue'],
    },
    informative: {
        styles: ['clean', 'clear', 'professional', 'sharp'],
        colors: ['blue', 'white', 'gray', 'neutral'],
    },
    humorous: {
        styles: ['playful', 'colorful', 'fun', 'quirky'],
        colors: ['pink', 'yellow', 'purple', 'bright'],
    },
    urgent: {
        styles: ['bold', 'attention-grabbing', 'high energy', 'breaking'],
        colors: ['red', 'orange', 'black', 'white'],
    },
    inspiring: {
        styles: ['uplifting', 'sunrise', 'achievement', 'hopeful'],
        colors: ['gold', 'blue', 'white', 'warm'],
    },
};

/**
 * Gemini API response type
 */
interface GeminiResponse {
    candidates: Array<{
        content: {
            parts: Array<{ text: string }>;
        };
    }>;
}

/**
 * SemanticMatcher class for generating visual queries from scenes
 */
export class SemanticMatcher {
    private apiKey: string;
    private options: Required<SemanticMatcherOptions>;

    constructor(options: SemanticMatcherOptions = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.apiKey = getEnv().GEMINI_API_KEY || '';
    }

    /**
     * Check if AI is available
     */
    isConfigured(): boolean {
        return !!this.apiKey;
    }

    /**
     * Generate visual queries for all scenes in an analysis
     */
    async generateQueries(analysis: SceneAnalysis): Promise<QueryGenerationResult> {
        const startTime = Date.now();

        // If Gemini available, use AI-powered generation
        if (this.isConfigured()) {
            try {
                return await this.generateQueriesWithAI(analysis, startTime);
            } catch (error) {
                console.warn('[SemanticMatcher] AI generation failed, falling back to rule-based:', error);
            }
        }

        // Fallback to rule-based generation
        return this.generateQueriesRuleBased(analysis, startTime);
    }

    /**
     * AI-powered query generation using Gemini REST API
     */
    private async generateQueriesWithAI(
        analysis: SceneAnalysis,
        startTime: number
    ): Promise<QueryGenerationResult> {
        const prompt = this.buildQueryGenerationPrompt(analysis);
        const url = `${GEMINI_CONFIG.BASE_URL}/models/${GEMINI_CONFIG.MODEL}:generateContent?key=${this.apiKey}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), GEMINI_CONFIG.TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1024,
                    },
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }

            const data: GeminiResponse = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const parsed = this.parseAIResponse(text, analysis);

            return {
                ...parsed,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    modelUsed: 'gemini-2.0-flash',
                    processingTimeMs: Date.now() - startTime,
                },
            };
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * Build prompt for query generation
     */
    private buildQueryGenerationPrompt(analysis: SceneAnalysis): string {
        const sceneSummaries = analysis.scenes.map((scene, i) =>
            `Scene ${i + 1} (${scene.type}, ${scene.mood}): "${scene.content.slice(0, 100)}..."`
        ).join('\n');

        return `You are a visual content specialist for short-form video (TikTok/Reels/Shorts).

Given this script analysis for platform "${analysis.platform}", generate optimal stock photo/video search queries.

CATEGORY: ${analysis.category}
OVERALL THEME: ${analysis.overallTheme}

SCENES:
${sceneSummaries}

For each scene, provide:
1. PRIMARY_QUERY: The best search term for finding matching visuals (2-4 words, English)
2. SECONDARY_QUERIES: 2 alternative search terms
3. PREFER_VIDEO: true if scene needs motion/action, false for static concepts
4. STYLE_HINTS: 2-3 visual style keywords

Also provide:
- THEME_QUERY: Overall search term for visual consistency
- COLOR_PALETTE: 3-4 colors that match the mood

Format as JSON:
{
  "queries": [
    {
      "sceneId": "scene-0-hook",
      "primaryQuery": "...",
      "secondaryQueries": ["...", "..."],
      "preferVideo": true/false,
      "styleHints": ["...", "..."]
    }
  ],
  "themeQuery": "...",
  "colorPalette": ["...", "..."]
}

Important: Focus on VISUAL concepts that match the script meaning, not literal translations.`;
    }

    /**
     * Parse AI response into structured queries
     */
    private parseAIResponse(
        text: string,
        analysis: SceneAnalysis
    ): Omit<QueryGenerationResult, 'metadata'> {
        try {
            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            // Map queries with scene data
            const queries: VisualQuery[] = analysis.scenes.map((scene, i) => {
                const aiQuery = parsed.queries?.[i] || {};
                const moodStyles = MOOD_VISUAL_STYLES[scene.mood];

                return {
                    sceneId: scene.id,
                    primaryQuery: aiQuery.primaryQuery || scene.keywords.slice(0, 2).join(' '),
                    secondaryQueries: aiQuery.secondaryQueries || scene.keywords.slice(2, 4),
                    mood: scene.mood,
                    preferVideo: aiQuery.preferVideo ?? this.shouldPreferVideo(scene),
                    styleHints: aiQuery.styleHints || moodStyles.styles.slice(0, 2),
                    suggestedColors: moodStyles.colors,
                };
            });

            return {
                queries,
                themeQuery: parsed.themeQuery || analysis.overallTheme,
                colorPalette: parsed.colorPalette || ['blue', 'white', 'gray'],
            };
        } catch (error) {
            // If parsing fails, fall back to rule-based
            return this.generateQueriesRuleBasedCore(analysis);
        }
    }

    /**
     * Rule-based query generation (fallback)
     */
    private generateQueriesRuleBased(
        analysis: SceneAnalysis,
        startTime: number
    ): QueryGenerationResult {
        const result = this.generateQueriesRuleBasedCore(analysis);

        return {
            ...result,
            metadata: {
                generatedAt: new Date().toISOString(),
                modelUsed: 'rule-based',
                processingTimeMs: Date.now() - startTime,
            },
        };
    }

    /**
     * Core rule-based query generation logic
     */
    private generateQueriesRuleBasedCore(
        analysis: SceneAnalysis
    ): Omit<QueryGenerationResult, 'metadata'> {
        const queries: VisualQuery[] = analysis.scenes.map(scene => {
            const moodStyles = MOOD_VISUAL_STYLES[scene.mood];

            // Build primary query from keywords + category
            const primaryQuery = this.buildSearchQuery(scene, analysis.category);

            // Generate secondary queries
            const secondaryQueries = this.generateSecondaryQueries(scene, analysis.category);

            return {
                sceneId: scene.id,
                primaryQuery,
                secondaryQueries,
                mood: scene.mood,
                preferVideo: this.shouldPreferVideo(scene),
                styleHints: moodStyles.styles.slice(0, 2),
                suggestedColors: moodStyles.colors,
            };
        });

        // Theme query from overall analysis
        const themeQuery = analysis.overallTheme.split(':').pop()?.trim() || analysis.category;

        // Aggregate colors from all scenes
        const allColors = new Set<string>();
        queries.forEach(q => q.suggestedColors.forEach(c => allColors.add(c)));

        return {
            queries,
            themeQuery,
            colorPalette: [...allColors].slice(0, 4),
        };
    }

    /**
     * Build search query for a scene
     */
    private buildSearchQuery(scene: Scene, category: string): string {
        // Combine top keywords with category context
        const topKeywords = scene.keywords.slice(0, 2);

        if (topKeywords.length === 0) {
            return category;
        }

        // For hooks, add energy words
        if (scene.type === 'hook') {
            return `${topKeywords.join(' ')} dynamic`;
        }

        // For CTA, add action words
        if (scene.type === 'cta') {
            return `${topKeywords.join(' ')} action`;
        }

        return topKeywords.join(' ');
    }

    /**
     * Generate secondary/fallback queries
     */
    private generateSecondaryQueries(scene: Scene, category: string): string[] {
        const queries: string[] = [];

        // Use remaining keywords
        if (scene.keywords.length > 2) {
            queries.push(scene.keywords.slice(2, 4).join(' '));
        }

        // Add category-based fallback
        queries.push(`${category} ${scene.mood}`);

        // Add generic mood-based fallback
        const moodStyles = MOOD_VISUAL_STYLES[scene.mood];
        queries.push(moodStyles.styles[0]);

        return queries.slice(0, 2);
    }

    /**
     * Determine if scene should prefer video over image
     */
    private shouldPreferVideo(scene: Scene): boolean {
        if (!this.options.preferVideosForAction) return false;

        // Hooks often benefit from video
        if (scene.type === 'hook') return true;

        // Energetic and dramatic moods suit video
        if (scene.mood === 'energetic' || scene.mood === 'dramatic') return true;

        // Check for action keywords
        const actionKeywords = ['action', 'moving', 'running', 'walking', 'dancing', 'working'];
        const hasAction = scene.keywords.some(k =>
            actionKeywords.some(a => k.includes(a))
        );

        return hasAction;
    }

    /**
     * Score how well a visual matches a scene
     */
    scoreMatch(scene: Scene, visual: ValidatedImage): number {
        let score = 50; // Base score

        // Check keyword overlap with visual alt text
        const altLower = visual.alt.toLowerCase();
        const matchedKeywords = scene.keywords.filter(k => altLower.includes(k.toLowerCase()));
        score += matchedKeywords.length * 10; // +10 per matched keyword

        // Bonus for clean (no text) images
        if (visual.validation?.isClean) {
            score += 15;
        }

        // Penalty for text overlay
        if (visual.validation?.hasText) {
            score -= 20;
        }

        // Cap at 100
        return Math.min(100, Math.max(0, score));
    }
}

/**
 * Factory function for creating SemanticMatcher
 */
export function createSemanticMatcher(options?: SemanticMatcherOptions): SemanticMatcher {
    return new SemanticMatcher(options);
}
