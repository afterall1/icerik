/**
 * Audio Mixer
 * Handles audio track composition with ducking and normalization
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { AudioMixConfig, AudioTrack } from './types.js';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_BACKGROUND_VOLUME = 0.15;    // 15% volume for background music
const DUCKING_AMOUNT = 0.7;                // Reduce to 30% when voice present
const FADE_DURATION = 0.5;                 // Audio fade in/out duration

// =============================================================================
// Audio Mixer Class
// =============================================================================

export class AudioMixer {
    private config: AudioMixConfig;

    constructor(config: Partial<AudioMixConfig>) {
        this.config = {
            voiceoverPath: config.voiceoverPath || '',
            backgroundMusicPath: config.backgroundMusicPath,
            backgroundVolume: config.backgroundVolume ?? DEFAULT_BACKGROUND_VOLUME,
            enableDucking: config.enableDucking ?? true,
            duckingAmount: config.duckingAmount ?? DUCKING_AMOUNT,
            normalizeVolume: config.normalizeVolume ?? true
        };
    }

    /**
     * Generate FFmpeg filter chain for audio mixing
     */
    generateAudioFilters(): { filters: string[]; inputs: string[]; mappings: string[] } {
        const filters: string[] = [];
        const inputs: string[] = [];
        const mappings: string[] = [];

        // Voiceover is always input [1] (after video/images)
        const voiceoverInput = '1:a';
        inputs.push(this.config.voiceoverPath);

        if (this.config.backgroundMusicPath) {
            // Background music is input [2]
            const bgMusicInput = '2:a';
            inputs.push(this.config.backgroundMusicPath);

            if (this.config.enableDucking) {
                // Audio ducking: lower music volume when voice is present
                // Uses sidechaincompress filter
                filters.push(
                    // Normalize voiceover
                    `[${voiceoverInput}]loudnorm=I=-16:TP=-1.5:LRA=11[voice_norm]`,
                    // Set background volume and add fade in/out
                    `[${bgMusicInput}]volume=${this.config.backgroundVolume},afade=t=in:d=${FADE_DURATION},afade=t=out:st=-${FADE_DURATION}:d=${FADE_DURATION}[bg_vol]`,
                    // Sidechain compression: duck music when voice plays
                    `[bg_vol][voice_norm]sidechaincompress=threshold=0.02:ratio=8:attack=50:release=500[bg_ducked]`,
                    // Mix voice and ducked background
                    `[voice_norm][bg_ducked]amix=inputs=2:duration=first:dropout_transition=2[audio_mixed]`
                );
                mappings.push('[audio_mixed]');
            } else {
                // Simple mixing without ducking
                filters.push(
                    `[${voiceoverInput}]loudnorm=I=-16:TP=-1.5:LRA=11[voice_norm]`,
                    `[${bgMusicInput}]volume=${this.config.backgroundVolume}[bg_vol]`,
                    `[voice_norm][bg_vol]amix=inputs=2:duration=first:dropout_transition=2[audio_mixed]`
                );
                mappings.push('[audio_mixed]');
            }
        } else {
            // Voiceover only - just normalize
            if (this.config.normalizeVolume) {
                filters.push(`[${voiceoverInput}]loudnorm=I=-16:TP=-1.5:LRA=11[audio_out]`);
                mappings.push('[audio_out]');
            } else {
                mappings.push(voiceoverInput);
            }
        }

        return { filters, inputs, mappings };
    }

    /**
     * Get audio input files for FFmpeg command
     */
    getAudioInputs(): string[] {
        const inputs: string[] = [this.config.voiceoverPath];
        if (this.config.backgroundMusicPath) {
            inputs.push(this.config.backgroundMusicPath);
        }
        return inputs;
    }

    /**
     * Validate that audio files exist
     */
    async validateAudioFiles(): Promise<{ valid: boolean; errors: string[] }> {
        const errors: string[] = [];

        if (!this.config.voiceoverPath) {
            errors.push('Voiceover path is required');
        } else {
            try {
                await fs.access(this.config.voiceoverPath);
            } catch {
                errors.push(`Voiceover file not found: ${this.config.voiceoverPath}`);
            }
        }

        if (this.config.backgroundMusicPath) {
            try {
                await fs.access(this.config.backgroundMusicPath);
            } catch {
                errors.push(`Background music file not found: ${this.config.backgroundMusicPath}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get configuration
     */
    getConfig(): AudioMixConfig {
        return { ...this.config };
    }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createAudioMixer(config: Partial<AudioMixConfig>): AudioMixer {
    return new AudioMixer(config);
}

// =============================================================================
// Audio Utility Functions
// =============================================================================

/**
 * Generate FFmpeg filter for audio fade
 */
export function generateFadeFilter(
    fadeIn: boolean,
    fadeOut: boolean,
    duration: number,
    totalDuration?: number
): string {
    const filters: string[] = [];

    if (fadeIn) {
        filters.push(`afade=t=in:d=${duration}`);
    }

    if (fadeOut && totalDuration) {
        const fadeStart = totalDuration - duration;
        filters.push(`afade=t=out:st=${fadeStart}:d=${duration}`);
    }

    return filters.join(',');
}

/**
 * Calculate audio normalization parameters
 */
export function calculateNormalizationParams(targetLUFS: number = -16): {
    integratedLoudness: number;
    truePeak: number;
    loudnessRange: number;
} {
    return {
        integratedLoudness: targetLUFS,
        truePeak: -1.5,   // dBTP
        loudnessRange: 11  // LU
    };
}
