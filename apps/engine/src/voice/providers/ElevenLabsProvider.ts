/**
 * ElevenLabs TTS Provider
 * 
 * Integration with ElevenLabs Text-to-Speech API.
 * Primary provider for high-quality, natural-sounding voices.
 * 
 * @module voice/providers/ElevenLabsProvider
 */

import { createChildLogger } from '../../utils/logger.js';
import type {
    IVoiceProvider,
    Voice,
    VoiceGenerationRequest,
    VoiceGenerationResult,
    ProviderStatus,
    VoiceSettings,
} from '../voiceTypes.js';
import { VoiceError, DEFAULT_VOICE_SETTINGS } from '../voiceTypes.js';

const logger = createChildLogger('elevenlabs-provider');

/**
 * ElevenLabs API base URL
 */
const API_BASE = 'https://api.elevenlabs.io/v1';

/**
 * Default model for Turkish/multilingual content
 */
const DEFAULT_MODEL = 'eleven_multilingual_v2';

/**
 * ElevenLabs voice response shape
 */
interface ElevenLabsVoice {
    voice_id: string;
    name: string;
    category?: string;
    description?: string;
    preview_url?: string;
    labels?: Record<string, string>;
    available_for_tiers?: string[];
}

/**
 * ElevenLabs subscription info
 */
interface ElevenLabsSubscription {
    character_count: number;
    character_limit: number;
    next_character_count_reset_unix?: number;
}

/**
 * ElevenLabs TTS Provider Implementation
 */
export class ElevenLabsProvider implements IVoiceProvider {
    readonly name = 'elevenlabs' as const;
    private readonly apiKey: string | undefined;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.ELEVENLABS_API_KEY;
    }

    /**
     * Check if provider is configured with API key
     */
    isConfigured(): boolean {
        return Boolean(this.apiKey);
    }

    /**
     * Get available voices from ElevenLabs
     */
    async getVoices(): Promise<Voice[]> {
        if (!this.isConfigured()) {
            throw new VoiceError(
                'ElevenLabs API key not configured',
                'PROVIDER_NOT_CONFIGURED',
                'elevenlabs'
            );
        }

        try {
            const response = await fetch(`${API_BASE}/voices`, {
                headers: {
                    'xi-api-key': this.apiKey!,
                },
            });

            if (!response.ok) {
                throw new VoiceError(
                    `Failed to fetch voices: ${response.status}`,
                    'PROVIDER_ERROR',
                    'elevenlabs',
                    response.status === 429
                );
            }

            const data = await response.json() as { voices: ElevenLabsVoice[] };

            return data.voices.map((v) => this.mapVoice(v));
        } catch (error) {
            if (error instanceof VoiceError) throw error;
            logger.error({ error }, 'Failed to fetch ElevenLabs voices');
            throw new VoiceError(
                `Network error fetching voices: ${(error as Error).message}`,
                'NETWORK_ERROR',
                'elevenlabs',
                true
            );
        }
    }

    /**
     * Generate speech from text
     */
    async generateSpeech(request: VoiceGenerationRequest): Promise<VoiceGenerationResult> {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: 'ElevenLabs API key not configured',
                provider: 'elevenlabs',
            };
        }

        const settings: VoiceSettings = {
            ...DEFAULT_VOICE_SETTINGS,
            ...request.settings,
        };

        const modelId = request.modelId || DEFAULT_MODEL;

        try {
            logger.info({ voiceId: request.voiceId, textLength: request.text.length }, 'Generating ElevenLabs speech');

            const response = await fetch(
                `${API_BASE}/text-to-speech/${request.voiceId}`,
                {
                    method: 'POST',
                    headers: {
                        'xi-api-key': this.apiKey!,
                        'Content-Type': 'application/json',
                        'Accept': 'audio/mpeg',
                    },
                    body: JSON.stringify({
                        text: request.text,
                        model_id: modelId,
                        voice_settings: {
                            stability: settings.stability,
                            similarity_boost: settings.similarityBoost,
                            style: settings.style ?? 0,
                            use_speaker_boost: true,
                        },
                    }),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                logger.error({ status: response.status, error: errorText }, 'ElevenLabs generation failed');

                if (response.status === 401) {
                    return {
                        success: false,
                        error: 'Invalid API key',
                        provider: 'elevenlabs',
                    };
                }

                if (response.status === 429) {
                    return {
                        success: false,
                        error: 'Rate limit exceeded',
                        provider: 'elevenlabs',
                    };
                }

                return {
                    success: false,
                    error: `Generation failed: ${response.status}`,
                    provider: 'elevenlabs',
                };
            }

            const audioBuffer = Buffer.from(await response.arrayBuffer());

            // Estimate duration based on typical speech rate (~150 words/min)
            const wordCount = request.text.split(/\s+/).length;
            const estimatedDuration = (wordCount / 150) * 60;

            logger.info(
                { voiceId: request.voiceId, audioSize: audioBuffer.length, estimatedDuration },
                'ElevenLabs generation successful'
            );

            return {
                success: true,
                audioBuffer,
                durationSeconds: estimatedDuration,
                contentType: 'audio/mpeg',
                charactersUsed: request.text.length,
                provider: 'elevenlabs',
            };
        } catch (error) {
            logger.error({ error }, 'ElevenLabs generation error');
            return {
                success: false,
                error: `Network error: ${(error as Error).message}`,
                provider: 'elevenlabs',
            };
        }
    }

    /**
     * Get provider status including quota
     */
    async getStatus(): Promise<ProviderStatus> {
        if (!this.isConfigured()) {
            return {
                provider: 'elevenlabs',
                available: false,
                error: 'API key not configured',
            };
        }

        try {
            const response = await fetch(`${API_BASE}/user/subscription`, {
                headers: {
                    'xi-api-key': this.apiKey!,
                },
            });

            if (!response.ok) {
                return {
                    provider: 'elevenlabs',
                    available: false,
                    error: `API error: ${response.status}`,
                };
            }

            const data = await response.json() as ElevenLabsSubscription;

            const quotaRemaining = data.character_limit - data.character_count;
            const resetAt = data.next_character_count_reset_unix
                ? new Date(data.next_character_count_reset_unix * 1000).toISOString()
                : undefined;

            return {
                provider: 'elevenlabs',
                available: quotaRemaining > 0,
                quotaRemaining,
                quotaLimit: data.character_limit,
                quotaResetAt: resetAt,
            };
        } catch (error) {
            logger.error({ error }, 'Failed to get ElevenLabs status');
            return {
                provider: 'elevenlabs',
                available: false,
                error: `Network error: ${(error as Error).message}`,
            };
        }
    }

    /**
     * Get preview URL for a voice
     */
    async getPreviewUrl(voiceId: string): Promise<string | null> {
        if (!this.isConfigured()) return null;

        try {
            const response = await fetch(`${API_BASE}/voices/${voiceId}`, {
                headers: {
                    'xi-api-key': this.apiKey!,
                },
            });

            if (!response.ok) return null;

            const data = await response.json() as ElevenLabsVoice;
            return data.preview_url || null;
        } catch {
            return null;
        }
    }

    /**
     * Map ElevenLabs voice to common Voice interface
     */
    private mapVoice(v: ElevenLabsVoice): Voice {
        return {
            id: v.voice_id,
            name: v.name,
            provider: 'elevenlabs',
            description: v.description,
            previewUrl: v.preview_url,
            category: v.category,
            labels: v.labels,
            gender: this.parseGender(v.labels),
            age: this.parseAge(v.labels),
            isCloned: v.category === 'cloned',
        };
    }

    /**
     * Parse gender from labels
     */
    private parseGender(labels?: Record<string, string>): 'male' | 'female' | 'neutral' | undefined {
        if (!labels) return undefined;
        const gender = labels.gender?.toLowerCase();
        if (gender === 'male') return 'male';
        if (gender === 'female') return 'female';
        return undefined;
    }

    /**
     * Parse age from labels
     */
    private parseAge(labels?: Record<string, string>): 'young' | 'middle_aged' | 'old' | undefined {
        if (!labels) return undefined;
        const age = labels.age?.toLowerCase();
        if (age === 'young') return 'young';
        if (age === 'middle aged' || age === 'middle_aged') return 'middle_aged';
        if (age === 'old') return 'old';
        return undefined;
    }
}

// Singleton instance
let instance: ElevenLabsProvider | null = null;

/**
 * Get the singleton ElevenLabs provider instance
 */
export function getElevenLabsProvider(): ElevenLabsProvider {
    if (!instance) {
        instance = new ElevenLabsProvider();
    }
    return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetElevenLabsProvider(): void {
    instance = null;
}
