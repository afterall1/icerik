/**
 * Caption Generator
 * Generates word-by-word timed captions for video overlay
 * Implements Netflix/BBC standard: 15-20 characters per second
 */

import type {
    CaptionWord,
    TimelineSection,
    CaptionStyle,
    VideoPlatform
} from './types.js';
import { CAPTION_STYLES, PLATFORM_PROFILES } from './types.js';

// =============================================================================
// Constants
// =============================================================================

const TARGET_CPS = 17;              // Characters per second (middle of 15-20 range)
const MIN_WORD_DURATION = 0.15;     // Minimum duration per word (150ms)
const MAX_WORD_DURATION = 1.5;      // Maximum duration per word
const PUNCTUATION_PAUSE = 0.3;      // Extra pause after punctuation
const EMPHASIS_WORDS = [
    'amazing', 'incredible', 'secret', 'shocking', 'never', 'always',
    'best', 'worst', 'only', 'must', 'stop', 'wait', 'listen',
    'important', 'critical', 'urgent', 'warning', 'attention',
    'dikkat', 'önemli', 'şok', 'inanılmaz', 'muhteşem', 'asla', 'hemen'
];

// =============================================================================
// Caption Generator Class
// =============================================================================

export class CaptionGenerator {
    private captionStyle: CaptionStyle['type'];
    private platform: VideoPlatform;
    private safeZone: { bottom: number };

    constructor(captionStyle: CaptionStyle['type'], platform: VideoPlatform) {
        this.captionStyle = captionStyle;
        this.platform = platform;
        this.safeZone = PLATFORM_PROFILES[platform].safeZone;
    }

    /**
     * Generate captions for all timeline sections
     */
    generateCaptions(sections: TimelineSection[]): TimelineSection[] {
        return sections.map(section => ({
            ...section,
            captions: this.generateSectionCaptions(section)
        }));
    }

    /**
     * Generate word-by-word captions for a single section
     */
    private generateSectionCaptions(section: TimelineSection): CaptionWord[] {
        const words = this.tokenizeText(section.text);
        if (words.length === 0) return [];

        const captions: CaptionWord[] = [];
        const sectionStart = section.startTime;
        const sectionDuration = section.duration;

        // Calculate total "weight" based on character count + punctuation pauses
        let totalWeight = 0;
        const wordWeights: number[] = [];

        for (const word of words) {
            let weight = word.length;

            // Add pause weight for punctuation
            if (this.hasPunctuation(word)) {
                weight += PUNCTUATION_PAUSE * TARGET_CPS;
            }

            wordWeights.push(weight);
            totalWeight += weight;
        }

        // Distribute time based on weights
        let currentTime = sectionStart;

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const weight = wordWeights[i];

            // Calculate duration proportionally
            let duration = (weight / totalWeight) * sectionDuration;

            // Clamp duration
            duration = Math.max(MIN_WORD_DURATION, Math.min(MAX_WORD_DURATION, duration));

            const caption: CaptionWord = {
                text: word,
                startTime: currentTime,
                endTime: currentTime + duration,
                isHighlighted: this.isEmphasisWord(word)
            };

            captions.push(caption);
            currentTime += duration;
        }

        // Normalize to fit exactly within section duration
        if (captions.length > 0) {
            const lastCaption = captions[captions.length - 1];
            const overflow = lastCaption.endTime - (sectionStart + sectionDuration);

            if (Math.abs(overflow) > 0.01) {
                // Scale all caption times to fit
                const scale = sectionDuration / (lastCaption.endTime - sectionStart);
                for (const caption of captions) {
                    const relativeStart = caption.startTime - sectionStart;
                    const relativeDuration = caption.endTime - caption.startTime;
                    caption.startTime = sectionStart + relativeStart * scale;
                    caption.endTime = caption.startTime + relativeDuration * scale;
                }
            }
        }

        return captions;
    }

    /**
     * Split text into words, preserving punctuation
     */
    private tokenizeText(text: string): string[] {
        // Split on whitespace, filter empty strings
        return text
            .split(/\s+/)
            .filter(word => word.length > 0)
            .map(word => word.trim());
    }

    /**
     * Check if word ends with punctuation
     */
    private hasPunctuation(word: string): boolean {
        return /[.!?,;:]$/.test(word);
    }

    /**
     * Check if word should be highlighted for emphasis
     */
    private isEmphasisWord(word: string): boolean {
        const cleanWord = word.toLowerCase().replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ]/g, '');
        return EMPHASIS_WORDS.includes(cleanWord);
    }

    /**
     * Get caption style configuration
     */
    getCaptionStyle(): CaptionStyle {
        return {
            type: this.captionStyle,
            ...CAPTION_STYLES[this.captionStyle]
        };
    }

    /**
     * Calculate safe Y position for captions (avoiding UI overlay areas)
     */
    getSafeYPosition(): number {
        const profile = PLATFORM_PROFILES[this.platform];
        const safeBottom = profile.height - this.safeZone.bottom;

        // Position captions in the upper portion of the safe area
        switch (CAPTION_STYLES[this.captionStyle].position) {
            case 'top':
                return profile.safeZone.top + 100;
            case 'center':
                return profile.height / 2;
            case 'bottom':
            default:
                return safeBottom - 100;
        }
    }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createCaptionGenerator(
    captionStyle: CaptionStyle['type'],
    platform: VideoPlatform
): CaptionGenerator {
    return new CaptionGenerator(captionStyle, platform);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate estimated reading time for text
 */
export function estimateReadingTime(text: string): number {
    const wordCount = text.split(/\s+/).length;
    const charCount = text.length;

    // Use character-based calculation (more accurate for different languages)
    return charCount / TARGET_CPS;
}

/**
 * Format caption time to SRT timestamp format
 */
export function formatSRTTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/**
 * Generate SRT subtitle file content from captions
 */
export function generateSRT(captions: CaptionWord[]): string {
    return captions
        .map((caption, index) => {
            const startTime = formatSRTTimestamp(caption.startTime);
            const endTime = formatSRTTimestamp(caption.endTime);
            return `${index + 1}\n${startTime} --> ${endTime}\n${caption.text}\n`;
        })
        .join('\n');
}
