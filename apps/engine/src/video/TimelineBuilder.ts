/**
 * Timeline Builder
 * Converts script sections and images into a timed video timeline
 */

import { randomUUID } from 'crypto';
import type {
    TimelineSection,
    ImageClip,
    KenBurnsEffect,
    TransitionConfig,
    ScriptSectionType,
    VideoGenerationOptions,
    KEN_BURNS_EFFECTS
} from './types.js';
import { TRANSITION_PRESETS } from './types.js';

// =============================================================================
// Constants
// =============================================================================

const MIN_IMAGE_DURATION = 2.0;   // seconds
const MAX_IMAGE_DURATION = 5.0;   // seconds
const DEFAULT_TRANSITION_DURATION = 0.3;
const KEN_BURNS_INTENSITY = 0.1;  // 10% zoom/pan

// =============================================================================
// Timeline Builder Class
// =============================================================================

export class TimelineBuilder {
    private kenBurnsIndex = 0;
    private transitionStyle: VideoGenerationOptions['transitionStyle'];
    private kenBurnsEnabled: boolean;

    constructor(options: VideoGenerationOptions) {
        this.transitionStyle = options.transitionStyle;
        this.kenBurnsEnabled = options.kenBurnsEnabled;
    }

    /**
     * Build complete timeline from script, images, and audio duration
     */
    buildTimeline(
        script: { hook: string; body: string; cta: string },
        images: { hook: string[]; body: string[]; cta: string[] },
        audioDuration: number
    ): TimelineSection[] {
        const sections: TimelineSection[] = [];

        // Calculate section durations based on text length ratio
        const totalTextLength = script.hook.length + script.body.length + script.cta.length;

        const hookRatio = script.hook.length / totalTextLength;
        const bodyRatio = script.body.length / totalTextLength;
        const ctaRatio = script.cta.length / totalTextLength;

        // Ensure minimum section duration of 2 seconds
        const hookDuration = Math.max(2, audioDuration * hookRatio);
        const bodyDuration = Math.max(2, audioDuration * bodyRatio);
        const ctaDuration = Math.max(2, audioDuration * ctaRatio);

        // Normalize to exact audio duration
        const totalCalculated = hookDuration + bodyDuration + ctaDuration;
        const scale = audioDuration / totalCalculated;

        let currentTime = 0;

        // Hook section
        const hookSection = this.buildSection(
            'hook',
            script.hook,
            images.hook,
            currentTime,
            hookDuration * scale
        );
        sections.push(hookSection);
        currentTime += hookDuration * scale;

        // Body section
        const bodySection = this.buildSection(
            'body',
            script.body,
            images.body,
            currentTime,
            bodyDuration * scale
        );
        sections.push(bodySection);
        currentTime += bodyDuration * scale;

        // CTA section
        const ctaSection = this.buildSection(
            'cta',
            script.cta,
            images.cta,
            currentTime,
            ctaDuration * scale
        );
        sections.push(ctaSection);

        return sections;
    }

    /**
     * Build a single section with image clips
     */
    private buildSection(
        type: ScriptSectionType,
        text: string,
        imagePaths: string[],
        startTime: number,
        duration: number
    ): TimelineSection {
        const imageClips = this.distributeImages(imagePaths, duration);

        return {
            id: randomUUID(),
            type,
            text,
            startTime,
            duration,
            images: imageClips,
            captions: []  // Will be populated by CaptionGenerator
        };
    }

    /**
     * Distribute images evenly across section duration
     */
    private distributeImages(imagePaths: string[], sectionDuration: number): ImageClip[] {
        if (imagePaths.length === 0) {
            return [];
        }

        const clips: ImageClip[] = [];
        const imageCount = imagePaths.length;
        const baseDuration = sectionDuration / imageCount;

        // Clamp duration to min/max
        const clampedDuration = Math.max(
            MIN_IMAGE_DURATION,
            Math.min(MAX_IMAGE_DURATION, baseDuration)
        );

        let currentTime = 0;

        for (let i = 0; i < imageCount; i++) {
            const isLast = i === imageCount - 1;

            // Last image fills remaining time
            const duration = isLast
                ? sectionDuration - currentTime
                : clampedDuration;

            const clip: ImageClip = {
                id: randomUUID(),
                path: imagePaths[i],
                startTime: currentTime,
                duration,
                effect: this.getNextKenBurnsEffect(),
                transition: this.getTransition(i > 0)
            };

            clips.push(clip);
            currentTime += duration;
        }

        return clips;
    }

    /**
     * Get alternating Ken Burns effect for visual variety
     */
    private getNextKenBurnsEffect(): KenBurnsEffect {
        if (!this.kenBurnsEnabled) {
            return { type: 'none', intensity: 0 };
        }

        const effects: KenBurnsEffect['type'][] = [
            'zoom-in',
            'zoom-out',
            'pan-left',
            'pan-right'
        ];

        const effectType = effects[this.kenBurnsIndex % effects.length];
        this.kenBurnsIndex++;

        return {
            type: effectType,
            intensity: KEN_BURNS_INTENSITY
        };
    }

    /**
     * Get transition configuration
     */
    private getTransition(hasPrevious: boolean): TransitionConfig {
        if (!hasPrevious) {
            return { type: 'none', duration: 0 };
        }

        return TRANSITION_PRESETS[this.transitionStyle];
    }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createTimelineBuilder(options: VideoGenerationOptions): TimelineBuilder {
    return new TimelineBuilder(options);
}
