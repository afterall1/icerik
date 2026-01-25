/**
 * Fish Audio TTS Provider
 * 
 * Integration with Fish Audio Text-to-Speech API.
 * Fallback provider with cost-effective pricing and emotion control.
 * 
 * @module voice/providers/FishAudioProvider
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

const logger = createChildLogger('fishaudio-provider');

/**
 * Fish Audio API base URL
 */
const API_BASE = 'https://api.fish.audio/v1';

/**
 * Default model for Fish Audio
 */
const DEFAULT_MODEL = 'speech-1.6';

/**
 * Fish Audio voice response shape
 */
interface FishAudioVoice {
    _id: string;
    title: string;
    description?: string;
    cover_image?: string;
    samples?: Array<{ audio: string }>;
    languages?: string[];
    tags?: string[];
    visibility?: string;
}

/**
 * Fish Audio TTS Provider Implementation
 */
export class FishAudioProvider implements IVoiceProvider {
    readonly name = 'fishaudio' as const;
    private readonly apiKey: string | undefined;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.FISHAUDIO_API_KEY;
    }

    /**
     * Check if provider is configured with API key
     */
    isConfigured(): boolean {
        return Boolean(this.apiKey);
    }

    /**
     * Get available voices from Fish Audio
     * Note: Fish Audio uses reference voices, we'll provide popular ones
     */
    async getVoices(): Promise<Voice[]> {
        if (!this.isConfigured()) {
            throw new VoiceError(
                'Fish Audio API key not configured',
                'PROVIDER_NOT_CONFIGURED',
                'fishaudio'
            );
        }

        try {
            // Fetch popular public voices
            const response = await fetch(`${API_BASE}/models?page=1&size=20&sort=popular`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey!}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new VoiceError(
                    `Failed to fetch voices: ${response.status}`,
                    'PROVIDER_ERROR',
                    'fishaudio',
                    response.status === 429
                );
            }

            const data = await response.json() as { items: FishAudioVoice[] };

            return data.items.map((v) => this.mapVoice(v));
        } catch (error) {
            if (error instanceof VoiceError) throw error;
            logger.error({ error }, 'Failed to fetch Fish Audio voices');
            throw new VoiceError(
                `Network error fetching voices: ${(error as Error).message}`,
                'NETWORK_ERROR',
                'fishaudio',
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
                error: 'Fish Audio API key not configured',
                provider: 'fishaudio',
            };
        }

        const settings: VoiceSettings = {
            ...DEFAULT_VOICE_SETTINGS,
            ...request.settings,
        };

        try {
            logger.info({ voiceId: request.voiceId, textLength: request.text.length }, 'Generating Fish Audio speech');

            const response = await fetch(`${API_BASE}/tts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey!}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: request.text,
                    reference_id: request.voiceId,
                    format: request.format || 'mp3',
                    mp3_bitrate: 128,
                    opus_bitrate: 64,
                    latency: 'normal',
                    speed: settings.speed,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error({ status: response.status, error: errorText }, 'Fish Audio generation failed');

                if (response.status === 401) {
                    return {
                        success: false,
                        error: 'Invalid API key',
                        provider: 'fishaudio',
                    };
                }

                if (response.status === 429) {
                    return {
                        success: false,
                        error: 'Rate limit exceeded',
                        provider: 'fishaudio',
                    };
                }

                if (response.status === 402) {
                    return {
                        success: false,
                        error: 'Insufficient credits',
                        provider: 'fishaudio',
                    };
                }

                return {
                    success: false,
                    error: `Generation failed: ${response.status}`,
                    provider: 'fishaudio',
                };
            }

            const audioBuffer = Buffer.from(await response.arrayBuffer());

            // Estimate duration based on typical speech rate (~150 words/min)
            const wordCount = request.text.split(/\s+/).length;
            const estimatedDuration = (wordCount / 150) * 60 / settings.speed;

            // Calculate bytes used (for cost tracking)
            const bytesUsed = new TextEncoder().encode(request.text).length;

            logger.info(
                { voiceId: request.voiceId, audioSize: audioBuffer.length, estimatedDuration, bytesUsed },
                'Fish Audio generation successful'
            );

            return {
                success: true,
                audioBuffer,
                durationSeconds: estimatedDuration,
                contentType: 'audio/mpeg',
                charactersUsed: bytesUsed,
                provider: 'fishaudio',
            };
        } catch (error) {
            logger.error({ error }, 'Fish Audio generation error');
            return {
                success: false,
                error: `Network error: ${(error as Error).message}`,
                provider: 'fishaudio',
            };
        }
    }

    /**
     * Get provider status
     * Note: Fish Audio uses pay-as-you-go, no fixed quota
     */
    async getStatus(): Promise<ProviderStatus> {
        if (!this.isConfigured()) {
            return {
                provider: 'fishaudio',
                available: false,
                error: 'API key not configured',
            };
        }

        try {
            // Validate API key by fetching user/account info
            const response = await fetch(`${API_BASE}/wallet`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey!}`,
                },
            });

            if (!response.ok) {
                return {
                    provider: 'fishaudio',
                    available: false,
                    error: `API error: ${response.status}`,
                };
            }

            const data = await response.json() as { balance?: number };

            return {
                provider: 'fishaudio',
                available: true,
                quotaRemaining: data.balance,
                // Fish Audio uses pay-as-you-go, no fixed limit
            };
        } catch (error) {
            logger.error({ error }, 'Failed to get Fish Audio status');
            return {
                provider: 'fishaudio',
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
            const response = await fetch(`${API_BASE}/models/${voiceId}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey!}`,
                },
            });

            if (!response.ok) return null;

            const data = await response.json() as FishAudioVoice;
            return data.samples?.[0]?.audio || null;
        } catch {
            return null;
        }
    }

    /**
     * Map Fish Audio voice to common Voice interface
     */
    private mapVoice(v: FishAudioVoice): Voice {
        return {
            id: v._id,
            name: v.title,
            provider: 'fishaudio',
            description: v.description,
            previewUrl: v.samples?.[0]?.audio,
            languages: v.languages,
            labels: v.tags ? Object.fromEntries(v.tags.map((t, i) => [`tag${i}`, t])) : undefined,
        };
    }
}

// Singleton instance
let instance: FishAudioProvider | null = null;

/**
 * Get the singleton Fish Audio provider instance
 */
export function getFishAudioProvider(): FishAudioProvider {
    if (!instance) {
        instance = new FishAudioProvider();
    }
    return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetFishAudioProvider(): void {
    instance = null;
}
