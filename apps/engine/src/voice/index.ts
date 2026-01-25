/**
 * Voice Generation Module
 * 
 * Exports all voice-related functionality for the trend engine.
 * Provides TTS (Text-to-Speech) capabilities with ElevenLabs and Fish Audio.
 * 
 * @module voice
 */

// Types
export {
    type Voice,
    type VoiceSettings,
    type VoiceProvider,
    type VoiceGenerationRequest,
    type VoiceGenerationResult,
    type ProviderStatus,
    type VoiceListResponse,
    type CachedAudio,
    type IVoiceProvider,
    VoiceError,
    DEFAULT_VOICE_SETTINGS,
} from './voiceTypes.js';

// Voice Service
export {
    VoiceService,
    getVoiceService,
    resetVoiceService,
} from './VoiceService.js';

// Voice Cache
export {
    VoiceCache,
    getVoiceCache,
    resetVoiceCache,
    generateTextHash,
    generateCacheId,
} from './VoiceCache.js';

// Providers
export {
    ElevenLabsProvider,
    getElevenLabsProvider,
    resetElevenLabsProvider,
} from './providers/ElevenLabsProvider.js';

export {
    FishAudioProvider,
    getFishAudioProvider,
    resetFishAudioProvider,
} from './providers/FishAudioProvider.js';
