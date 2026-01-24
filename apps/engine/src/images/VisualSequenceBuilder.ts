/**
 * VisualSequenceBuilder Module
 * 
 * Orchestrates full visual sequence generation for a script.
 * Combines SceneAnalyzer, SemanticMatcher, and ImageSearchService.
 * 
 * @module images/VisualSequenceBuilder
 */

import type { PlatformScript, Platform } from '@icerik/shared';
import { SceneAnalyzer, type Scene, type SceneAnalysis } from './SceneAnalyzer.js';
import { SemanticMatcher, type VisualQuery, type QueryGenerationResult } from './SemanticMatcher.js';
import { ImageSearchService, type ValidatedImage, type ImageSearchResult } from './ImageSearchService.js';

/**
 * Visual assignment for a single scene
 */
export interface SceneVisual {
    /** The scene this visual is for */
    scene: Scene;
    /** Query used to find this visual */
    query: VisualQuery;
    /** Selected primary visual */
    visual: ValidatedImage;
    /** Match quality score (0-100) */
    matchScore: number;
    /** Reason for match */
    matchReason: string;
    /** Alternative visuals user can choose from */
    alternatives: ValidatedImage[];
}

/**
 * Complete visual sequence for a script
 */
export interface VisualSequence {
    /** Script identifier */
    scriptId: string;
    /** Platform */
    platform: Platform;
    /** Trend ID reference */
    trendId: string;
    /** Scene-visual assignments */
    sceneVisuals: SceneVisual[];
    /** Overall coherence score (0-100) */
    coherenceScore: number;
    /** Theme query used for consistency */
    themeQuery: string;
    /** Suggested color palette */
    colorPalette: string[];
    /** Any warnings about the sequence */
    warnings: string[];
    /** Generation metadata */
    metadata: {
        generatedAt: string;
        totalScenes: number;
        avgMatchScore: number;
        processingTimeMs: number;
        scenesWithVideo: number;
        scenesWithImage: number;
    };
}

/**
 * Configuration for sequence building
 */
export interface SequenceBuilderOptions {
    /** Max alternatives to keep per scene */
    maxAlternatives?: number;
    /** Minimum match score to accept (0-100) */
    minMatchScore?: number;
    /** Validate all images with Gemini */
    validateImages?: boolean;
    /** Search up to this many images per scene */
    searchCountPerScene?: number;
}

const DEFAULT_OPTIONS: Required<SequenceBuilderOptions> = {
    maxAlternatives: 3,
    minMatchScore: 40,
    validateImages: true,
    searchCountPerScene: 6,
};

/**
 * VisualSequenceBuilder class for complete sequence generation
 */
export class VisualSequenceBuilder {
    private sceneAnalyzer: SceneAnalyzer;
    private semanticMatcher: SemanticMatcher;
    private imageService: ImageSearchService;
    private options: Required<SequenceBuilderOptions>;

    constructor(options: SequenceBuilderOptions = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.sceneAnalyzer = new SceneAnalyzer();
        this.semanticMatcher = new SemanticMatcher();
        this.imageService = new ImageSearchService();
    }

    /**
     * Build a complete visual sequence for a script
     */
    async buildSequence(
        script: PlatformScript,
        category: string = 'general'
    ): Promise<VisualSequence> {
        const startTime = Date.now();
        const warnings: string[] = [];

        // Step 1: Analyze script into scenes
        const analysis = this.sceneAnalyzer.analyzeScript(script, category);

        if (analysis.scenes.length === 0) {
            warnings.push('No scenes could be extracted from script');
            return this.createEmptySequence(script, startTime, warnings);
        }

        // Step 2: Generate visual queries for scenes
        const queryResult = await this.semanticMatcher.generateQueries(analysis);

        // Step 3: Search for visuals for each scene
        const sceneVisuals = await this.searchVisualsForScenes(
            analysis,
            queryResult,
            warnings
        );

        // Step 4: Calculate coherence score
        const coherenceScore = this.calculateCoherence(sceneVisuals);

        // Step 5: Add warnings for low-quality matches
        this.addQualityWarnings(sceneVisuals, warnings);

        // Calculate stats
        const avgMatchScore = sceneVisuals.length > 0
            ? Math.round(sceneVisuals.reduce((sum, sv) => sum + sv.matchScore, 0) / sceneVisuals.length)
            : 0;

        const scenesWithVideo = sceneVisuals.filter(sv => sv.query.preferVideo).length;

        return {
            scriptId: analysis.scriptId,
            platform: script.platform,
            trendId: script.metadata.trendId,
            sceneVisuals,
            coherenceScore,
            themeQuery: queryResult.themeQuery,
            colorPalette: queryResult.colorPalette,
            warnings,
            metadata: {
                generatedAt: new Date().toISOString(),
                totalScenes: sceneVisuals.length,
                avgMatchScore,
                processingTimeMs: Date.now() - startTime,
                scenesWithVideo,
                scenesWithImage: sceneVisuals.length - scenesWithVideo,
            },
        };
    }

    /**
     * Search for visuals for all scenes
     */
    private async searchVisualsForScenes(
        analysis: SceneAnalysis,
        queryResult: QueryGenerationResult,
        warnings: string[]
    ): Promise<SceneVisual[]> {
        const sceneVisuals: SceneVisual[] = [];

        for (let i = 0; i < analysis.scenes.length; i++) {
            const scene = analysis.scenes[i];
            const query = queryResult.queries[i];

            if (!query) {
                warnings.push(`No query generated for scene ${i + 1}`);
                continue;
            }

            try {
                // Try primary query first
                let searchResult = await this.imageService.searchByQuery(
                    query.primaryQuery,
                    {
                        count: this.options.searchCountPerScene,
                        validateImages: this.options.validateImages,
                    }
                );

                // If no results, try secondary queries
                if (searchResult.images.length === 0 && query.secondaryQueries.length > 0) {
                    for (const secondaryQuery of query.secondaryQueries) {
                        searchResult = await this.imageService.searchByQuery(
                            secondaryQuery,
                            {
                                count: this.options.searchCountPerScene,
                                validateImages: this.options.validateImages,
                            }
                        );
                        if (searchResult.images.length > 0) break;
                    }
                }

                // If still no results, use theme query as fallback
                if (searchResult.images.length === 0) {
                    searchResult = await this.imageService.searchByQuery(
                        queryResult.themeQuery,
                        {
                            count: this.options.searchCountPerScene,
                            validateImages: this.options.validateImages,
                        }
                    );
                }

                // Select best visual and alternatives
                const selected = this.selectBestVisual(scene, searchResult.images);

                if (selected) {
                    sceneVisuals.push({
                        scene,
                        query,
                        visual: selected.visual,
                        matchScore: selected.score,
                        matchReason: selected.reason,
                        alternatives: selected.alternatives,
                    });
                } else {
                    warnings.push(`No suitable visual found for scene ${i + 1} (${scene.type})`);
                }

            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                warnings.push(`Search failed for scene ${i + 1}: ${message}`);
            }
        }

        return sceneVisuals;
    }

    /**
     * Select the best visual from search results
     */
    private selectBestVisual(
        scene: Scene,
        images: ValidatedImage[]
    ): { visual: ValidatedImage; score: number; reason: string; alternatives: ValidatedImage[] } | null {
        if (images.length === 0) return null;

        // Score all images
        const scored = images.map(img => ({
            image: img,
            score: this.semanticMatcher.scoreMatch(scene, img),
        }));

        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);

        // Filter by minimum score
        const acceptable = scored.filter(s => s.score >= this.options.minMatchScore);

        if (acceptable.length === 0) {
            // If none meet threshold, take best available with warning
            const best = scored[0];
            return {
                visual: best.image,
                score: best.score,
                reason: `Best available (below threshold: ${this.options.minMatchScore})`,
                alternatives: scored.slice(1, 1 + this.options.maxAlternatives).map(s => s.image),
            };
        }

        const best = acceptable[0];
        const alternatives = acceptable.slice(1, 1 + this.options.maxAlternatives).map(s => s.image);

        // Determine match reason
        const reasons: string[] = [];
        if (best.image.validation?.isClean) reasons.push('clean image');
        if (best.score >= 80) reasons.push('strong keyword match');
        else if (best.score >= 60) reasons.push('good keyword match');

        const reason = reasons.length > 0
            ? reasons.join(', ')
            : 'acceptable match';

        return {
            visual: best.image,
            score: best.score,
            reason,
            alternatives,
        };
    }

    /**
     * Calculate overall sequence coherence
     */
    private calculateCoherence(sceneVisuals: SceneVisual[]): number {
        if (sceneVisuals.length <= 1) return 100;

        let coherencePoints = 0;
        let maxPoints = 0;

        for (let i = 1; i < sceneVisuals.length; i++) {
            const prev = sceneVisuals[i - 1];
            const curr = sceneVisuals[i];

            maxPoints += 100;

            // Check for color consistency (mock check - would need actual color analysis)
            const bothClean = prev.visual.validation?.isClean && curr.visual.validation?.isClean;
            if (bothClean) coherencePoints += 30;

            // Check mood consistency
            if (prev.scene.mood === curr.scene.mood) {
                coherencePoints += 20;
            } else {
                // Adjacent moods are somewhat coherent
                coherencePoints += 10;
            }

            // Score similarity bonus
            const scoreDiff = Math.abs(prev.matchScore - curr.matchScore);
            if (scoreDiff < 10) coherencePoints += 20;
            else if (scoreDiff < 20) coherencePoints += 10;

            // Type transition bonus (hook→body→cta is natural)
            const naturalTransition =
                (prev.scene.type === 'hook' && curr.scene.type === 'body') ||
                (prev.scene.type === 'body' && curr.scene.type === 'cta') ||
                (prev.scene.type === 'body' && curr.scene.type === 'body');
            if (naturalTransition) coherencePoints += 30;
        }

        return maxPoints > 0 ? Math.round((coherencePoints / maxPoints) * 100) : 100;
    }

    /**
     * Add warnings for quality issues
     */
    private addQualityWarnings(sceneVisuals: SceneVisual[], warnings: string[]): void {
        // Low average score warning
        const avgScore = sceneVisuals.reduce((sum, sv) => sum + sv.matchScore, 0) / sceneVisuals.length;
        if (avgScore < 50) {
            warnings.push(`Low average match score (${Math.round(avgScore)}) - consider different search terms`);
        }

        // Individual scene warnings
        sceneVisuals.forEach((sv, i) => {
            if (sv.matchScore < this.options.minMatchScore) {
                warnings.push(`Scene ${i + 1} match score below threshold (${sv.matchScore})`);
            }
            if (sv.visual.validation?.hasText) {
                warnings.push(`Scene ${i + 1} visual contains text overlay`);
            }
        });
    }

    /**
     * Create an empty sequence when no scenes found
     */
    private createEmptySequence(
        script: PlatformScript,
        startTime: number,
        warnings: string[]
    ): VisualSequence {
        return {
            scriptId: `${script.platform}-${script.metadata.trendId}`,
            platform: script.platform,
            trendId: script.metadata.trendId,
            sceneVisuals: [],
            coherenceScore: 0,
            themeQuery: '',
            colorPalette: [],
            warnings,
            metadata: {
                generatedAt: new Date().toISOString(),
                totalScenes: 0,
                avgMatchScore: 0,
                processingTimeMs: Date.now() - startTime,
                scenesWithVideo: 0,
                scenesWithImage: 0,
            },
        };
    }

    /**
     * Regenerate visual for a specific scene
     */
    async regenerateSceneVisual(
        sequence: VisualSequence,
        sceneIndex: number,
        alternativeQuery?: string
    ): Promise<VisualSequence> {
        const sceneVisual = sequence.sceneVisuals[sceneIndex];
        if (!sceneVisual) {
            throw new Error(`Scene index ${sceneIndex} not found`);
        }

        const query = alternativeQuery || sceneVisual.query.secondaryQueries[0] || sceneVisual.query.primaryQuery;

        const searchResult = await this.imageService.searchByQuery(
            query,
            {
                count: this.options.searchCountPerScene,
                validateImages: this.options.validateImages,
            }
        );

        const selected = this.selectBestVisual(sceneVisual.scene, searchResult.images);

        if (selected) {
            sequence.sceneVisuals[sceneIndex] = {
                ...sceneVisual,
                visual: selected.visual,
                matchScore: selected.score,
                matchReason: selected.reason,
                alternatives: selected.alternatives,
            };

            // Recalculate coherence
            sequence.coherenceScore = this.calculateCoherence(sequence.sceneVisuals);
        }

        return sequence;
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { entries: number; maxEntries: number; ttlMs: number } {
        return this.imageService.getCacheStats();
    }
}

/**
 * Factory function for creating VisualSequenceBuilder
 */
export function createVisualSequenceBuilder(options?: SequenceBuilderOptions): VisualSequenceBuilder {
    return new VisualSequenceBuilder(options);
}
