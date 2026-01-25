/**
 * Voice Types
 * 
 * TypeScript types for voice generation system in the dashboard.
 * 
 * @module lib/voiceTypes
 */

/**
 * Voice provider options
 */
export type VoiceProvider = 'elevenlabs' | 'fishaudio';

/**
 * Voice settings for generation
 */
export interface VoiceSettings {
    /** Voice stability (0-1) */
    stability: number;
    /** Similarity boost (0-1) */
    similarityBoost: number;
    /** Speed multiplier (0.5-2.0) */
    speed: number;
    /** Style exaggeration (0-1) */
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
 * Voice metadata
 */
export interface Voice {
    /** Unique voice ID */
    id: string;
    /** Display name */
    name: string;
    /** Provider source */
    provider: VoiceProvider;
    /** Description */
    description?: string;
    /** Preview audio URL */
    previewUrl?: string;
    /** Category */
    category?: string;
    /** Supported languages */
    languages?: string[];
    /** Gender */
    gender?: 'male' | 'female' | 'neutral';
    /** Age range */
    age?: 'young' | 'middle_aged' | 'old';
    /** Is cloned voice */
    isCloned?: boolean;
    /** Labels */
    labels?: Record<string, string>;
}

/**
 * Voice configuration for persistence
 */
export interface VoiceConfig {
    /** Voice ID */
    voiceId: string;
    /** Display name */
    name: string;
    /** Provider */
    provider: VoiceProvider;
    /** Preview URL */
    previewUrl?: string;
    /** Is cloned voice */
    isCloned: boolean;
    /** Voice settings */
    settings: VoiceSettings;
    /** Created timestamp */
    createdAt: string;
    /** Is primary voice */
    isPrimary: boolean;
}

/**
 * Voice selection state stored in IndexedDB
 */
export interface VoiceSelectionState {
    /** Primary voice configuration */
    primaryVoice: VoiceConfig | null;
    /** Alternative voice configurations */
    alternativeVoices: VoiceConfig[];
    /** Last used timestamp */
    lastUsedAt: string;
}

/**
 * Generated audio cache entry
 */
export interface GeneratedAudio {
    /** Unique ID (scriptId + voiceId hash) */
    id: string;
    /** Script ID */
    scriptId: string;
    /** Voice ID used */
    voiceId: string;
    /** Platform */
    platform: 'tiktok' | 'reels' | 'shorts';
    /** Audio blob */
    audioBlob: Blob;
    /** Duration in seconds */
    durationSeconds: number;
    /** Generated timestamp */
    generatedAt: string;
    /** Text content hash */
    textHash: string;
}

/**
 * Voice list response from API
 */
export interface VoiceListResponse {
    voices: Voice[];
    provider: VoiceProvider;
    total: number;
}

/**
 * Provider status from API
 */
export interface ProviderStatus {
    provider: VoiceProvider;
    available: boolean;
    quotaRemaining?: number;
    quotaLimit?: number;
    quotaResetAt?: string;
    error?: string;
}

/**
 * Voice generation options
 */
export interface VoiceGenerationOptions {
    voiceId: string;
    provider?: VoiceProvider;
    settings?: Partial<VoiceSettings>;
    format?: 'mp3' | 'wav' | 'ogg';
}

/**
 * Create empty voice selection state
 */
export function createEmptyVoiceSelectionState(): VoiceSelectionState {
    return {
        primaryVoice: null,
        alternativeVoices: [],
        lastUsedAt: new Date().toISOString(),
    };
}

/**
 * Create voice config from Voice metadata
 */
export function createVoiceConfig(
    voice: Voice,
    settings?: Partial<VoiceSettings>,
    isPrimary = false
): VoiceConfig {
    return {
        voiceId: voice.id,
        name: voice.name,
        provider: voice.provider,
        previewUrl: voice.previewUrl,
        isCloned: voice.isCloned || false,
        settings: {
            ...DEFAULT_VOICE_SETTINGS,
            ...settings,
        },
        createdAt: new Date().toISOString(),
        isPrimary,
    };
}

/**
 * Generate hash from text for caching
 */
export function generateTextHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

/**
 * Generate audio cache ID
 */
export function generateAudioCacheId(scriptId: string, voiceId: string): string {
    return `${scriptId}_${voiceId}`;
}
