/**
 * Video Module Index
 * Re-exports all video editing components
 */

// Main Agent
export { VideoEditingAgent, getVideoEditingAgent } from './VideoEditingAgent.js';

// Core Components
export { TimelineBuilder, createTimelineBuilder } from './TimelineBuilder.js';
export { CaptionGenerator, createCaptionGenerator, estimateReadingTime, formatSRTTimestamp, generateSRT } from './CaptionGenerator.js';
export { AudioMixer, createAudioMixer, generateFadeFilter, calculateNormalizationParams } from './AudioMixer.js';
export { FFmpegComposer, createFFmpegComposer } from './FFmpegComposer.js';

// Types
export type {
    VideoPlatform,
    PlatformExportProfile,
    TimelineSection,
    ImageClip,
    KenBurnsEffect,
    TransitionConfig,
    CaptionWord,
    CaptionStyle,
    AudioTrack,
    AudioMixConfig,
    VideoProject,
    VideoGenerationOptions,
    VideoJobStatus,
    VideoGenerationResult,
    VideoGenerationProgress,
    FFmpegFilterConfig,
    FFmpegComplexFilter,
    ScriptSectionType
} from './types.js';

// Constants
export {
    PLATFORM_PROFILES,
    CAPTION_STYLES,
    KEN_BURNS_EFFECTS,
    TRANSITION_PRESETS
} from './types.js';
