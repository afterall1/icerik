/**
 * Voice Generation Types
 * 
 * Shared types for TTS voice generation system.
 * 
 * @module voice/types
 */

/**
 * Supported TTS providers
 */
export type VoiceProvider = 'elevenlabs' | 'fishaudio';

/**
 * Voice settings for generation
 */
export interface VoiceSettings {
    /** Voice stability (0-1) - Higher = more consistent, lower = more expressive */
    stability: number;
    /** Similarity boost (0-1) - How closely to match the original voice */
    similarityBoost: number;
    /** Speed multiplier (0.5-2.0) */
    speed: number;
    /** Style exaggeration (0-1) - ElevenLabs specific */
    style?: number;
}

/**
 * Default voice settings
 */
export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
    stability: 0.5,
    similarityBoost: 0.75,
    speed: 1.0,
    style: 0.0,
};

/**
 * Voice metadata from provider
 */
export interface Voice {
    /** Unique voice ID from provider */
    id: string;
    /** Display name */
    name: string;
    /** Provider source */
    provider: VoiceProvider;
    /** Voice description */
    description?: string;
    /** Preview audio URL */
    previewUrl?: string;
    /** Voice category/type */
    category?: string;
    /** Supported languages */
    languages?: string[];
    /** Gender */
    gender?: 'male' | 'female' | 'neutral';
    /** Age range */
    age?: 'young' | 'middle_aged' | 'old';
    /** Whether this is a cloned voice */
    isCloned?: boolean;
    /** Labels/tags */
    labels?: Record<string, string>;
}

/**
 * Voice generation request
 */
export interface VoiceGenerationRequest {
    /** Text to synthesize */
    text: string;
    /** Voice ID to use */
    voiceId: string;
    /** Provider to use */
    provider?: VoiceProvider;
    /** Voice settings */
    settings?: Partial<VoiceSettings>;
    /** Output format */
    format?: 'mp3' | 'wav' | 'ogg';
    /** Model ID (provider-specific) */
    modelId?: string;
}

/**
 * Voice generation result
 */
export interface VoiceGenerationResult {
    /** Success status */
    success: boolean;
    /** Audio buffer (on success) */
    audioBuffer?: Buffer;
    /** Audio duration in seconds */
    durationSeconds?: number;
    /** Content type */
    contentType?: string;
    /** Characters consumed */
    charactersUsed?: number;
    /** Error message (on failure) */
    error?: string;
    /** Provider used */
    provider: VoiceProvider;
}

/**
 * Provider status
 */
export interface ProviderStatus {
    /** Provider name */
    provider: VoiceProvider;
    /** Whether provider is available */
    available: boolean;
    /** Character/credit quota remaining */
    quotaRemaining?: number;
    /** Character/credit limit */
    quotaLimit?: number;
    /** Quota reset date */
    quotaResetAt?: string;
    /** Error if unavailable */
    error?: string;
}

/**
 * Voice list response
 */
export interface VoiceListResponse {
    /** Available voices */
    voices: Voice[];
    /** Provider source */
    provider: VoiceProvider;
    /** Total count */
    total: number;
}

/**
 * Cached audio entry (for SQLite storage)
 */
export interface CachedAudio {
    /** Unique cache ID */
    id: string;
    /** Hash of the text content */
    textHash: string;
    /** Voice ID used */
    voiceId: string;
    /** Provider used */
    provider: VoiceProvider;
    /** Audio data as base64 */
    audioBase64: string;
    /** Content type */
    contentType: string;
    /** Duration in seconds */
    durationSeconds: number;
    /** Size in bytes */
    sizeBytes: number;
    /** Creation timestamp */
    createdAt: string;
    /** Last accessed timestamp */
    lastAccessedAt: string;
    /** Access count */
    accessCount: number;
}

/**
 * Voice provider interface
 */
export interface IVoiceProvider {
    /** Provider name */
    readonly name: VoiceProvider;

    /** Check if provider is configured */
    isConfigured(): boolean;

    /** Get available voices */
    getVoices(): Promise<Voice[]>;

    /** Generate speech from text */
    generateSpeech(request: VoiceGenerationRequest): Promise<VoiceGenerationResult>;

    /** Get provider status */
    getStatus(): Promise<ProviderStatus>;

    /** Get voice preview URL */
    getPreviewUrl(voiceId: string): Promise<string | null>;
}

/**
 * Error class for voice-related errors
 */
export class VoiceError extends Error {
    constructor(
        message: string,
        public readonly code: VoiceErrorCode,
        public readonly provider?: VoiceProvider,
        public readonly retryable: boolean = false
    ) {
        super(message);
        this.name = 'VoiceError';
    }
}

/**
 * Voice error codes
 */
export type VoiceErrorCode =
    | 'PROVIDER_NOT_CONFIGURED'
    | 'VOICE_NOT_FOUND'
    | 'GENERATION_FAILED'
    | 'QUOTA_EXCEEDED'
    | 'RATE_LIMITED'
    | 'INVALID_TEXT'
    | 'NETWORK_ERROR'
    | 'PROVIDER_ERROR';
