/**
 * Video Editing Agent - Type Definitions
 * Phase 26: Automated video generation from script, images, and audio
 */

// =============================================================================
// Platform Types
// =============================================================================

export type VideoPlatform = 'tiktok' | 'reels' | 'shorts';

export interface PlatformExportProfile {
    platform: VideoPlatform;
    width: number;
    height: number;
    fps: number;
    videoBitrate: string;
    audioBitrate: string;
    videoCodec: string;
    audioCodec: string;
    pixelFormat: string;
    maxDurationSeconds: number;
    safeZone: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
}

// =============================================================================
// Timeline Types
// =============================================================================

export type ScriptSectionType = 'hook' | 'body' | 'cta';

export interface TimelineSection {
    id: string;
    type: ScriptSectionType;
    text: string;
    startTime: number;      // seconds from video start
    duration: number;       // seconds
    images: ImageClip[];
    captions: CaptionWord[];
}

export interface ImageClip {
    id: string;
    path: string;
    startTime: number;      // relative to section start
    duration: number;
    effect: KenBurnsEffect;
    transition: TransitionConfig;
}

export interface KenBurnsEffect {
    type: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down' | 'none';
    intensity: number;      // 0.05 to 0.2 (5% to 20% movement)
}

export interface TransitionConfig {
    type: 'fade' | 'dissolve' | 'wipe-left' | 'wipe-right' | 'none';
    duration: number;       // seconds (typically 0.3-0.5)
}

// =============================================================================
// Caption Types
// =============================================================================

export interface CaptionWord {
    text: string;
    startTime: number;      // seconds from video start
    endTime: number;
    isHighlighted: boolean; // for emphasis words
}

export interface CaptionStyle {
    type: 'hormozi' | 'classic' | 'minimal';
    fontFamily: string;
    fontSize: number;
    fontColor: string;
    strokeColor: string;
    strokeWidth: number;
    backgroundColor: string;
    backgroundOpacity: number;
    position: 'bottom' | 'center' | 'top';
    animation: 'pop' | 'fade' | 'none';
}

// =============================================================================
// Audio Types
// =============================================================================

export interface AudioTrack {
    id: string;
    path: string;
    type: 'voiceover' | 'background';
    startTime: number;
    duration: number;
    volume: number;         // 0.0 to 1.0
    fadeIn?: number;        // seconds
    fadeOut?: number;       // seconds
}

export interface AudioMixConfig {
    voiceoverPath: string;
    backgroundMusicPath?: string;
    backgroundVolume: number;       // typically 0.1-0.3 when voiceover present
    enableDucking: boolean;         // auto-lower music when voice plays
    duckingAmount: number;          // how much to lower (0.0-1.0)
    normalizeVolume: boolean;
}

// =============================================================================
// Video Project Types
// =============================================================================

export interface VideoProject {
    id: string;
    platform: VideoPlatform;
    title: string;

    // Input content
    script: {
        hook: string;
        body: string;
        cta: string;
    };

    images: {
        hook: string[];       // file paths
        body: string[];
        cta: string[];
    };

    audio: {
        voiceoverPath: string;
        voiceoverDuration: number;
        backgroundMusicPath?: string;
    };

    // Generation options
    options: VideoGenerationOptions;

    // Metadata
    createdAt: string;
    status: VideoJobStatus;
}

export interface VideoGenerationOptions {
    captionStyle: CaptionStyle['type'];
    transitionStyle: 'smooth' | 'dynamic' | 'minimal';
    kenBurnsEnabled: boolean;
    backgroundMusicVolume: number;
    audioDucking: boolean;
}

export type VideoJobStatus =
    | 'queued'
    | 'building-timeline'
    | 'generating-captions'
    | 'composing-video'
    | 'encoding'
    | 'complete'
    | 'failed';

// =============================================================================
// Generation Result Types
// =============================================================================

export interface VideoGenerationResult {
    success: boolean;
    jobId: string;
    outputPath?: string;
    duration?: number;
    fileSize?: number;
    error?: string;
    processingTimeMs?: number;
}

export interface VideoGenerationProgress {
    jobId: string;
    status: VideoJobStatus;
    progress: number;       // 0-100
    currentStep: string;
    estimatedTimeRemaining?: number;
}

// =============================================================================
// FFmpeg Types
// =============================================================================

export interface FFmpegFilterConfig {
    filter: string;
    options: Record<string, string | number>;
    inputs?: string[];
    outputs?: string[];
}

export interface FFmpegComplexFilter {
    filters: FFmpegFilterConfig[];
    mapping: string[];
}

// =============================================================================
// Export Profile Constants
// =============================================================================

export const PLATFORM_PROFILES: Record<VideoPlatform, PlatformExportProfile> = {
    tiktok: {
        platform: 'tiktok',
        width: 1080,
        height: 1920,
        fps: 30,
        videoBitrate: '8M',
        audioBitrate: '320k',
        videoCodec: 'libx264',
        audioCodec: 'aac',
        pixelFormat: 'yuv420p',
        maxDurationSeconds: 600, // 10 minutes
        safeZone: {
            top: 100,
            bottom: 384,    // 20% of 1920
            left: 0,
            right: 108      // 10% of 1080
        }
    },
    reels: {
        platform: 'reels',
        width: 1080,
        height: 1920,
        fps: 30,
        videoBitrate: '10M',
        audioBitrate: '320k',
        videoCodec: 'libx264',
        audioCodec: 'aac',
        pixelFormat: 'yuv420p',
        maxDurationSeconds: 90,
        safeZone: {
            top: 100,
            bottom: 384,
            left: 0,
            right: 0
        }
    },
    shorts: {
        platform: 'shorts',
        width: 1080,
        height: 1920,
        fps: 30,
        videoBitrate: '10M',
        audioBitrate: '320k',
        videoCodec: 'libx264',
        audioCodec: 'aac',
        pixelFormat: 'yuv420p',
        maxDurationSeconds: 60,
        safeZone: {
            top: 150,
            bottom: 300,
            left: 0,
            right: 0
        }
    }
};

// =============================================================================
// Default Caption Styles
// =============================================================================

export const CAPTION_STYLES: Record<CaptionStyle['type'], Omit<CaptionStyle, 'type'>> = {
    hormozi: {
        fontFamily: 'Arial Black',
        fontSize: 64,
        fontColor: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 4,
        backgroundColor: '#000000',
        backgroundOpacity: 0,
        position: 'center',
        animation: 'pop'
    },
    classic: {
        fontFamily: 'Arial',
        fontSize: 48,
        fontColor: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 2,
        backgroundColor: '#000000',
        backgroundOpacity: 0.7,
        position: 'bottom',
        animation: 'fade'
    },
    minimal: {
        fontFamily: 'Helvetica',
        fontSize: 42,
        fontColor: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 1,
        backgroundColor: 'transparent',
        backgroundOpacity: 0,
        position: 'bottom',
        animation: 'none'
    }
};

// =============================================================================
// Ken Burns Effect Presets
// =============================================================================

export const KEN_BURNS_EFFECTS: KenBurnsEffect['type'][] = [
    'zoom-in',
    'zoom-out',
    'pan-left',
    'pan-right',
    'pan-up',
    'pan-down'
];

// =============================================================================
// Transition Presets
// =============================================================================

export const TRANSITION_PRESETS: Record<VideoGenerationOptions['transitionStyle'], TransitionConfig> = {
    smooth: {
        type: 'dissolve',
        duration: 0.5
    },
    dynamic: {
        type: 'wipe-left',
        duration: 0.3
    },
    minimal: {
        type: 'fade',
        duration: 0.2
    }
};
