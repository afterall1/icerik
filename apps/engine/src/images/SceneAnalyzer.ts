/**
 * SceneAnalyzer Module
 * 
 * Parses script sections into discrete scenes for visual matching.
 * Each scene represents a narrative unit that requires its own visual.
 * 
 * @module images/SceneAnalyzer
 */

import type { PlatformScript, ScriptSection, Platform } from '@icerik/shared';

/**
 * Scene types based on script structure
 */
export type SceneType = 'hook' | 'body' | 'transition' | 'cta' | 'intro' | 'climax';

/**
 * Visual mood for scene matching
 */
export type SceneMood =
    | 'energetic'      // High energy, action, excitement
    | 'calm'           // Peaceful, relaxed, neutral
    | 'dramatic'       // Intense, emotional, impactful
    | 'informative'    // Educational, clear, focused
    | 'humorous'       // Funny, playful, light
    | 'urgent'         // Time-sensitive, important, breaking
    | 'inspiring';     // Motivational, uplifting

/**
 * Individual scene extracted from script
 */
export interface Scene {
    /** Unique scene identifier */
    id: string;
    /** Scene type based on position in script */
    type: SceneType;
    /** Raw text content of this scene */
    content: string;
    /** Extracted keywords for visual search */
    keywords: string[];
    /** Detected mood/tone */
    mood: SceneMood;
    /** Estimated duration in seconds */
    durationHint: number;
    /** Word count */
    wordCount: number;
    /** Scene index (0-based) */
    index: number;
}

/**
 * Complete scene analysis result
 */
export interface SceneAnalysis {
    /** Script ID for reference */
    scriptId: string;
    /** Platform this script is for */
    platform: Platform;
    /** Extracted scenes */
    scenes: Scene[];
    /** Overall theme of the script */
    overallTheme: string;
    /** Content category */
    category: string;
    /** Total estimated duration */
    totalDuration: number;
    /** Analysis metadata */
    metadata: {
        analyzedAt: string;
        sceneCount: number;
        avgWordsPerScene: number;
    };
}

/**
 * Configuration for scene analysis
 */
export interface SceneAnalyzerOptions {
    /** Maximum words per scene before splitting */
    maxWordsPerScene?: number;
    /** Minimum words to form a scene */
    minWordsPerScene?: number;
    /** Include transition scenes between major sections */
    includeTransitions?: boolean;
}

const DEFAULT_OPTIONS: Required<SceneAnalyzerOptions> = {
    maxWordsPerScene: 50,
    minWordsPerScene: 5,
    includeTransitions: false,
};

/**
 * Mood detection keywords grouped by mood type
 */
const MOOD_KEYWORDS: Record<SceneMood, string[]> = {
    energetic: ['hızlı', 'fast', 'action', 'aksiyon', 'şimdi', 'now', 'boom', 'wow', 'incredible', 'inanılmaz', 'crazy', 'çılgın'],
    calm: ['sakin', 'calm', 'peaceful', 'huzur', 'slowly', 'yavaş', 'gentle', 'nazik', 'relax'],
    dramatic: ['şok', 'shock', 'unbelievable', 'inanamadım', 'never', 'asla', 'impossible', 'imkansız', 'tragic', 'trajik'],
    informative: ['nasıl', 'how', 'learn', 'öğren', 'fact', 'gerçek', 'study', 'research', 'araştırma', 'data', 'veri'],
    humorous: ['komik', 'funny', 'laugh', 'gül', 'joke', 'şaka', 'lol', 'haha', 'bruh', 'wait what'],
    urgent: ['breaking', 'son dakika', 'just now', 'az önce', 'urgent', 'acil', 'important', 'önemli', 'dikkat', 'attention'],
    inspiring: ['başarı', 'success', 'dream', 'hayal', 'achieve', 'başar', 'possible', 'mümkün', 'believe', 'inan', 'motivation'],
};

/**
 * Turkish/English stop words to filter from keywords
 */
const STOP_WORDS = new Set([
    // Turkish
    've', 'veya', 'ama', 'fakat', 'için', 'ile', 'bu', 'şu', 'o', 'bir', 'de', 'da', 'ki',
    'ne', 'nasıl', 'neden', 'niye', 'gibi', 'kadar', 'daha', 'çok', 'az', 'en', 'var', 'yok',
    // English
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    'and', 'or', 'but', 'if', 'because', 'so', 'that', 'this', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
]);

/**
 * SceneAnalyzer class for extracting visual scenes from scripts
 */
export class SceneAnalyzer {
    private options: Required<SceneAnalyzerOptions>;

    constructor(options: SceneAnalyzerOptions = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Analyze a platform script and extract scenes
     */
    analyzeScript(script: PlatformScript, category: string = 'general'): SceneAnalysis {
        const scenes: Scene[] = [];
        let sceneIndex = 0;

        // Process hook section
        if (script.sections.hook) {
            const hookScenes = this.extractScenesFromSection(
                script.sections.hook,
                'hook',
                sceneIndex
            );
            scenes.push(...hookScenes);
            sceneIndex += hookScenes.length;
        }

        // Process body section
        if (script.sections.body) {
            const bodyScenes = this.extractScenesFromSection(
                script.sections.body,
                'body',
                sceneIndex
            );
            scenes.push(...bodyScenes);
            sceneIndex += bodyScenes.length;
        }

        // Process CTA section
        if (script.sections.cta) {
            const ctaScenes = this.extractScenesFromSection(
                script.sections.cta,
                'cta',
                sceneIndex
            );
            scenes.push(...ctaScenes);
        }

        // Calculate overall theme
        const overallTheme = this.extractOverallTheme(script, category);

        // Calculate total duration
        const totalDuration = scenes.reduce((sum, s) => sum + s.durationHint, 0);

        return {
            scriptId: `${script.platform}-${script.metadata.trendId}`,
            platform: script.platform,
            scenes,
            overallTheme,
            category,
            totalDuration,
            metadata: {
                analyzedAt: new Date().toISOString(),
                sceneCount: scenes.length,
                avgWordsPerScene: scenes.length > 0
                    ? Math.round(scenes.reduce((sum, s) => sum + s.wordCount, 0) / scenes.length)
                    : 0,
            },
        };
    }

    /**
     * Extract scenes from a script section
     */
    private extractScenesFromSection(
        section: ScriptSection,
        type: SceneType,
        startIndex: number
    ): Scene[] {
        const content = section.content.trim();
        const words = content.split(/\s+/).filter((w: string) => w.length > 0);

        // If content is short enough, treat as single scene
        if (words.length <= this.options.maxWordsPerScene) {
            return [this.createScene(content, type, startIndex)];
        }

        // Split into multiple scenes by sentences
        const sentences = this.splitIntoSentences(content);
        const scenes: Scene[] = [];
        let currentContent = '';
        let currentWordCount = 0;
        let localIndex = 0;

        for (const sentence of sentences) {
            const sentenceWords = sentence.split(/\s+/).filter(w => w.length > 0).length;

            // If adding this sentence exceeds max, create scene from current content
            if (currentWordCount + sentenceWords > this.options.maxWordsPerScene && currentContent) {
                scenes.push(this.createScene(
                    currentContent.trim(),
                    this.getSubSceneType(type, localIndex, scenes.length),
                    startIndex + scenes.length
                ));
                currentContent = '';
                currentWordCount = 0;
                localIndex++;
            }

            currentContent += ' ' + sentence;
            currentWordCount += sentenceWords;
        }

        // Add remaining content
        if (currentContent.trim() && currentWordCount >= this.options.minWordsPerScene) {
            scenes.push(this.createScene(
                currentContent.trim(),
                this.getSubSceneType(type, localIndex, scenes.length),
                startIndex + scenes.length
            ));
        }

        return scenes;
    }

    /**
     * Create a scene object from content
     */
    private createScene(content: string, type: SceneType, index: number): Scene {
        const words = content.split(/\s+/).filter(w => w.length > 0);
        const wordCount = words.length;

        // Estimate duration: ~150 words per minute for video narration
        const durationHint = Math.max(2, Math.round((wordCount / 150) * 60));

        return {
            id: `scene-${index}-${type}`,
            type,
            content,
            keywords: this.extractKeywords(content),
            mood: this.detectMood(content, type),
            durationHint,
            wordCount,
            index,
        };
    }

    /**
     * Extract keywords from scene content
     */
    private extractKeywords(content: string): string[] {
        // Normalize and tokenize
        const normalized = content
            .toLowerCase()
            .replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const words = normalized.split(' ');

        // Filter stop words and short words
        const keywords = words
            .filter(word =>
                word.length > 2 &&
                !STOP_WORDS.has(word) &&
                !/^\d+$/.test(word)
            )
            .slice(0, 8); // Max 8 keywords per scene

        // Remove duplicates while preserving order
        return [...new Set(keywords)];
    }

    /**
     * Detect the mood of scene content
     */
    private detectMood(content: string, type: SceneType): SceneMood {
        const lowerContent = content.toLowerCase();

        // Score each mood based on keyword matches
        const scores: Record<SceneMood, number> = {
            energetic: 0,
            calm: 0,
            dramatic: 0,
            informative: 0,
            humorous: 0,
            urgent: 0,
            inspiring: 0,
        };

        for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
            for (const keyword of keywords) {
                if (lowerContent.includes(keyword)) {
                    scores[mood as SceneMood]++;
                }
            }
        }

        // Apply type-based biases
        if (type === 'hook') {
            scores.energetic += 2;
            scores.urgent += 1;
        } else if (type === 'cta') {
            scores.inspiring += 2;
            scores.energetic += 1;
        } else if (type === 'body') {
            scores.informative += 1;
        }

        // Find highest scoring mood
        let maxScore = 0;
        let detectedMood: SceneMood = 'informative';

        for (const [mood, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                detectedMood = mood as SceneMood;
            }
        }

        return detectedMood;
    }

    /**
     * Get sub-scene type for body sections
     */
    private getSubSceneType(baseType: SceneType, localIndex: number, total: number): SceneType {
        if (baseType !== 'body' || total <= 1) return baseType;

        // First body scene might be intro, last might be climax
        if (localIndex === 0) return 'intro';
        if (localIndex === total - 1) return 'climax';

        return 'body';
    }

    /**
     * Split content into sentences
     */
    private splitIntoSentences(content: string): string[] {
        // Split on sentence-ending punctuation
        return content
            .split(/(?<=[.!?])\s+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }

    /**
     * Extract overall theme from script
     */
    private extractOverallTheme(script: PlatformScript, category: string): string {
        // Combine title and category for theme
        const title = script.title || '';

        // Extract main nouns/concepts from title
        const titleKeywords = this.extractKeywords(title);

        if (titleKeywords.length > 0) {
            return `${category}: ${titleKeywords.slice(0, 3).join(', ')}`;
        }

        return category;
    }
}

/**
 * Factory function for creating SceneAnalyzer
 */
export function createSceneAnalyzer(options?: SceneAnalyzerOptions): SceneAnalyzer {
    return new SceneAnalyzer(options);
}
