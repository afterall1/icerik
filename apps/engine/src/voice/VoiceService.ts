/**
 * Voice Generation Service
 * 
 * Unified service for TTS voice generation with provider fallback,
 * caching, and quota management.
 * 
 * @module voice/VoiceService
 */

import { createChildLogger } from '../utils/logger.js';
import type {
    Voice,
    VoiceGenerationRequest,
    VoiceGenerationResult,
    ProviderStatus,
    VoiceProvider,
    IVoiceProvider,
    VoiceListResponse,
} from './voiceTypes.js';
import { VoiceError } from './voiceTypes.js';
import { getElevenLabsProvider } from './providers/ElevenLabsProvider.js';
import { getFishAudioProvider } from './providers/FishAudioProvider.js';
import { getVoiceCache, generateTextHash, generateCacheId } from './VoiceCache.js';

const logger = createChildLogger('voice-service');

/**
 * Provider priority order
 */
const PROVIDER_PRIORITY: VoiceProvider[] = ['elevenlabs', 'fishaudio'];

/**
 * Minimum quota threshold before fallback (characters)
 */
const MIN_QUOTA_THRESHOLD = 500;

/**
 * Voice Generation Service
 */
export class VoiceService {
    private providers: Map<VoiceProvider, IVoiceProvider> = new Map();

    constructor() {
        // Initialize providers
        this.providers.set('elevenlabs', getElevenLabsProvider());
        this.providers.set('fishaudio', getFishAudioProvider());
    }

    /**
     * Get a specific provider
     */
    private getProvider(name: VoiceProvider): IVoiceProvider | undefined {
        return this.providers.get(name);
    }

    /**
     * Get first available provider based on configuration and quota
     */
    private async getAvailableProvider(preferredProvider?: VoiceProvider): Promise<IVoiceProvider | null> {
        // If preferred provider is specified and available, use it
        if (preferredProvider) {
            const provider = this.getProvider(preferredProvider);
            if (provider?.isConfigured()) {
                const status = await provider.getStatus();
                if (status.available && (status.quotaRemaining === undefined || status.quotaRemaining > MIN_QUOTA_THRESHOLD)) {
                    return provider;
                }
            }
        }

        // Otherwise, try providers in priority order
        for (const providerName of PROVIDER_PRIORITY) {
            const provider = this.getProvider(providerName);
            if (!provider?.isConfigured()) continue;

            try {
                const status = await provider.getStatus();
                if (status.available && (status.quotaRemaining === undefined || status.quotaRemaining > MIN_QUOTA_THRESHOLD)) {
                    logger.debug({ provider: providerName }, 'Using provider');
                    return provider;
                }
            } catch (error) {
                logger.warn({ provider: providerName, error }, 'Provider status check failed');
            }
        }

        return null;
    }

    /**
     * Get available voices from a specific provider or all providers
     */
    async getVoices(provider?: VoiceProvider): Promise<VoiceListResponse> {
        if (provider) {
            const p = this.getProvider(provider);
            if (!p?.isConfigured()) {
                throw new VoiceError(
                    `Provider ${provider} not configured`,
                    'PROVIDER_NOT_CONFIGURED',
                    provider
                );
            }

            const voices = await p.getVoices();
            return {
                voices,
                provider,
                total: voices.length,
            };
        }

        // Get from all configured providers
        const allVoices: Voice[] = [];
        let primaryProvider: VoiceProvider = 'elevenlabs';

        for (const [name, p] of this.providers) {
            if (!p.isConfigured()) continue;

            try {
                const voices = await p.getVoices();
                allVoices.push(...voices);
                if (allVoices.length > 0 && primaryProvider === 'elevenlabs') {
                    primaryProvider = name;
                }
            } catch (error) {
                logger.warn({ provider: name, error }, 'Failed to fetch voices from provider');
            }
        }

        return {
            voices: allVoices,
            provider: primaryProvider,
            total: allVoices.length,
        };
    }

    /**
     * Generate speech from text with caching and fallback
     */
    async generateSpeech(request: VoiceGenerationRequest): Promise<VoiceGenerationResult> {
        // Validate request
        if (!request.text || request.text.trim().length === 0) {
            return {
                success: false,
                error: 'Text cannot be empty',
                provider: request.provider || 'elevenlabs',
            };
        }

        if (request.text.length > 10000) {
            return {
                success: false,
                error: 'Text too long (max 10,000 characters)',
                provider: request.provider || 'elevenlabs',
            };
        }

        // Check cache first
        const cache = getVoiceCache();
        const cached = cache.get(request.text, request.voiceId);

        if (cached) {
            logger.info({ voiceId: request.voiceId, cacheId: cached.id }, 'Voice cache HIT');
            return {
                success: true,
                audioBuffer: Buffer.from(cached.audioBase64, 'base64'),
                durationSeconds: cached.durationSeconds,
                contentType: cached.contentType,
                provider: cached.provider,
            };
        }

        // Get available provider
        const provider = await this.getAvailableProvider(request.provider);

        if (!provider) {
            return {
                success: false,
                error: 'No TTS provider available. Please configure ELEVENLABS_API_KEY or FISHAUDIO_API_KEY.',
                provider: request.provider || 'elevenlabs',
            };
        }

        // Generate with primary provider
        let result = await provider.generateSpeech(request);

        // If failed and not the only option, try fallback
        if (!result.success && !request.provider) {
            const fallbackProvider = await this.getAvailableProvider(
                provider.name === 'elevenlabs' ? 'fishaudio' : 'elevenlabs'
            );

            if (fallbackProvider && fallbackProvider.name !== provider.name) {
                logger.info(
                    { primary: provider.name, fallback: fallbackProvider.name },
                    'Trying fallback provider'
                );
                result = await fallbackProvider.generateSpeech(request);
            }
        }

        // Cache successful result
        if (result.success && result.audioBuffer) {
            try {
                cache.set(
                    request.text,
                    request.voiceId,
                    result.provider,
                    result.audioBuffer,
                    result.contentType || 'audio/mpeg',
                    result.durationSeconds || 0
                );
            } catch (error) {
                logger.warn({ error }, 'Failed to cache audio');
            }
        }

        return result;
    }

    /**
     * Get provider status for all configured providers
     */
    async getStatus(): Promise<ProviderStatus[]> {
        const statuses: ProviderStatus[] = [];

        for (const [name, provider] of this.providers) {
            if (!provider.isConfigured()) {
                statuses.push({
                    provider: name,
                    available: false,
                    error: 'Not configured',
                });
                continue;
            }

            try {
                const status = await provider.getStatus();
                statuses.push(status);
            } catch (error) {
                statuses.push({
                    provider: name,
                    available: false,
                    error: (error as Error).message,
                });
            }
        }

        return statuses;
    }

    /**
     * Get voice preview URL
     */
    async getPreviewUrl(voiceId: string, provider?: VoiceProvider): Promise<string | null> {
        const p = provider
            ? this.getProvider(provider)
            : await this.getAvailableProvider();

        if (!p) return null;

        return p.getPreviewUrl(voiceId);
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { totalEntries: number; totalSizeBytes: number; oldestEntry: string | null } {
        return getVoiceCache().getStats();
    }

    /**
     * Clear voice cache
     */
    clearCache(): number {
        return getVoiceCache().clear();
    }
}

// Singleton instance
let instance: VoiceService | null = null;

/**
 * Get the singleton VoiceService instance
 */
export function getVoiceService(): VoiceService {
    if (!instance) {
        instance = new VoiceService();
    }
    return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetVoiceService(): void {
    instance = null;
}
