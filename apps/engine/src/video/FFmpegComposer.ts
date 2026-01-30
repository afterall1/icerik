/**
 * FFmpeg Composer
 * Generates FFmpeg commands for video composition from timeline
 */

import { promises as fs } from 'fs';
import path from 'path';
import type {
    TimelineSection,
    ImageClip,
    CaptionWord,
    KenBurnsEffect,
    VideoPlatform,
    PlatformExportProfile,
    CaptionStyle
} from './types.js';
import { PLATFORM_PROFILES, CAPTION_STYLES } from './types.js';

// =============================================================================
// Constants
// =============================================================================

const TEMP_DIR = 'data/video-temp';

// =============================================================================
// FFmpeg Composer Class
// =============================================================================

export class FFmpegComposer {
    private platform: VideoPlatform;
    private profile: PlatformExportProfile;
    private captionStyleType: CaptionStyle['type'];

    constructor(platform: VideoPlatform, captionStyle: CaptionStyle['type']) {
        this.platform = platform;
        this.profile = PLATFORM_PROFILES[platform];
        this.captionStyleType = captionStyle;
    }

    /**
     * Generate complete FFmpeg filter complex for video composition
     */
    generateFilterComplex(
        sections: TimelineSection[],
        totalDuration: number
    ): { filterComplex: string; inputFiles: string[] } {
        const inputFiles: string[] = [];
        const filterParts: string[] = [];
        let inputIndex = 0;

        // Collect all image inputs
        const imageInputs: { path: string; clip: ImageClip; section: TimelineSection }[] = [];

        for (const section of sections) {
            for (const clip of section.images) {
                imageInputs.push({ path: clip.path, clip, section });
                inputFiles.push(clip.path);
            }
        }

        // Generate filters for each image
        const scaledStreams: string[] = [];

        for (let i = 0; i < imageInputs.length; i++) {
            const { clip } = imageInputs[i];
            const inputLabel = `${i}:v`;
            const scaledLabel = `scaled${i}`;

            // Scale and Ken Burns effect
            const scaleFilter = this.generateScaleFilter(inputLabel, scaledLabel, clip);
            filterParts.push(scaleFilter);
            scaledStreams.push(`[${scaledLabel}]`);
        }

        // Generate timeline with fade transitions
        let currentStreamLabel = 'base';

        // Create base canvas (black background)
        filterParts.push(
            `color=c=black:s=${this.profile.width}x${this.profile.height}:d=${totalDuration}:r=${this.profile.fps}[${currentStreamLabel}]`
        );

        // Overlay each image at correct time
        let streamIndex = 0;
        for (const section of sections) {
            for (const clip of section.images) {
                const absoluteStart = section.startTime + clip.startTime;
                const overlayLabel = `overlay${streamIndex}`;

                // Overlay with enable expression for timing
                filterParts.push(
                    `[${currentStreamLabel}][scaled${streamIndex}]overlay=` +
                    `enable='between(t,${absoluteStart},${absoluteStart + clip.duration})':` +
                    `x=(W-w)/2:y=(H-h)/2[${overlayLabel}]`
                );

                currentStreamLabel = overlayLabel;
                streamIndex++;
            }
        }

        // Add caption overlay (using drawtext)
        const captionFilter = this.generateCaptionFilter(sections, currentStreamLabel);
        if (captionFilter) {
            filterParts.push(captionFilter.filter);
            currentStreamLabel = captionFilter.output;
        }

        // Final output label
        filterParts.push(`[${currentStreamLabel}]format=${this.profile.pixelFormat}[video_out]`);

        return {
            filterComplex: filterParts.join(';'),
            inputFiles
        };
    }

    /**
     * Generate scale and Ken Burns filter for single image
     */
    private generateScaleFilter(
        inputLabel: string,
        outputLabel: string,
        clip: ImageClip
    ): string {
        const { width, height, fps } = this.profile;
        const frameCount = Math.ceil(clip.duration * fps);

        // Base: scale to fit and pad to exact dimensions
        let filter = `[${inputLabel}]`;

        // Scale to cover (slightly larger for Ken Burns movement)
        const scaleFactor = 1 + (clip.effect.intensity * 2);
        filter += `scale=${Math.ceil(width * scaleFactor)}:${Math.ceil(height * scaleFactor)}:force_original_aspect_ratio=increase,`;
        filter += `crop=${width}:${height},`;

        // Apply Ken Burns effect using zoompan
        if (clip.effect.type !== 'none') {
            const zoompan = this.generateZoompan(clip.effect, frameCount);
            filter += `zoompan=${zoompan},`;
        }

        // Ensure fps and set duration
        filter += `fps=${fps},setpts=PTS-STARTPTS,trim=0:${clip.duration}`;
        filter += `[${outputLabel}]`;

        return filter;
    }

    /**
     * Generate zoompan expression for Ken Burns effect
     */
    private generateZoompan(effect: KenBurnsEffect, frameCount: number): string {
        const { width, height } = this.profile;
        const intensity = effect.intensity;

        // Base zoom level
        const baseZoom = 1.0;
        const maxZoom = 1 + intensity;

        let zoomExpr: string;
        let xExpr: string;
        let yExpr: string;

        switch (effect.type) {
            case 'zoom-in':
                zoomExpr = `'min(${maxZoom},zoom+${intensity / frameCount})'`;
                xExpr = `'iw/2-(iw/zoom/2)'`;
                yExpr = `'ih/2-(ih/zoom/2)'`;
                break;
            case 'zoom-out':
                zoomExpr = `'max(${baseZoom},${maxZoom}-${intensity / frameCount}*on)'`;
                xExpr = `'iw/2-(iw/zoom/2)'`;
                yExpr = `'ih/2-(ih/zoom/2)'`;
                break;
            case 'pan-left':
                zoomExpr = `'${maxZoom}'`;
                xExpr = `'max(0,${intensity}*iw-${intensity}*iw/in_a*on)'`;
                yExpr = `'ih/2-(ih/zoom/2)'`;
                break;
            case 'pan-right':
                zoomExpr = `'${maxZoom}'`;
                xExpr = `'min(iw-iw/zoom,${intensity}*iw/in_a*on)'`;
                yExpr = `'ih/2-(ih/zoom/2)'`;
                break;
            case 'pan-up':
                zoomExpr = `'${maxZoom}'`;
                xExpr = `'iw/2-(iw/zoom/2)'`;
                yExpr = `'max(0,${intensity}*ih-${intensity}*ih/in_a*on)'`;
                break;
            case 'pan-down':
                zoomExpr = `'${maxZoom}'`;
                xExpr = `'iw/2-(iw/zoom/2)'`;
                yExpr = `'min(ih-ih/zoom,${intensity}*ih/in_a*on)'`;
                break;
            default:
                zoomExpr = '1';
                xExpr = '0';
                yExpr = '0';
        }

        return `z=${zoomExpr}:x=${xExpr}:y=${yExpr}:d=${frameCount}:s=${width}x${height}:fps=${this.profile.fps}`;
    }

    /**
     * Generate drawtext filter for captions
     */
    private generateCaptionFilter(
        sections: TimelineSection[],
        inputLabel: string
    ): { filter: string; output: string } | null {
        const allCaptions: CaptionWord[] = [];
        for (const section of sections) {
            allCaptions.push(...section.captions);
        }

        if (allCaptions.length === 0) {
            return null;
        }

        const style = CAPTION_STYLES[this.captionStyleType];
        const { height } = this.profile;

        // Calculate Y position based on style
        let yPosition: number;
        switch (style.position) {
            case 'top':
                yPosition = 200;
                break;
            case 'center':
                yPosition = height / 2;
                break;
            case 'bottom':
            default:
                yPosition = height - this.profile.safeZone.bottom - 100;
        }

        // Generate drawtext filter for each word
        const drawtextFilters: string[] = [];
        let outputLabel = inputLabel;

        for (let i = 0; i < allCaptions.length; i++) {
            const caption = allCaptions[i];
            const nextLabel = `caption${i}`;

            // Escape special characters for FFmpeg
            const escapedText = this.escapeText(caption.text);

            // Build drawtext filter
            const fontColor = caption.isHighlighted ? '#FFD700' : style.fontColor;

            const drawtext = [
                `[${outputLabel}]drawtext=`,
                `text='${escapedText}'`,
                `:fontfile='C\\:/Windows/Fonts/arial.ttf'`,  // Windows font path
                `:fontsize=${style.fontSize}`,
                `:fontcolor=${fontColor}`,
                `:borderw=${style.strokeWidth}`,
                `:bordercolor=${style.strokeColor}`,
                `:x=(w-tw)/2`,
                `:y=${yPosition}`,
                `:enable='between(t,${caption.startTime},${caption.endTime})'`,
                `[${nextLabel}]`
            ].join('');

            drawtextFilters.push(drawtext);
            outputLabel = nextLabel;
        }

        return {
            filter: drawtextFilters.join(';'),
            output: outputLabel
        };
    }

    /**
     * Escape text for FFmpeg drawtext filter
     */
    private escapeText(text: string): string {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "'\\''")
            .replace(/:/g, '\\:')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]');
    }

    /**
     * Generate complete FFmpeg command arguments
     */
    generateCommandArgs(
        inputFiles: string[],
        filterComplex: string,
        audioInputs: string[],
        audioMapping: string,
        outputPath: string
    ): string[] {
        const args: string[] = [];

        // Input files
        for (const file of inputFiles) {
            args.push('-loop', '1', '-i', file);
        }

        // Audio inputs
        for (const audio of audioInputs) {
            args.push('-i', audio);
        }

        // Filter complex
        args.push('-filter_complex', filterComplex);

        // Map video and audio outputs
        args.push('-map', '[video_out]');
        args.push('-map', audioMapping);

        // Video codec settings
        args.push('-c:v', this.profile.videoCodec);
        args.push('-preset', 'medium');
        args.push('-crf', '23');
        args.push('-b:v', this.profile.videoBitrate);
        args.push('-maxrate', this.profile.videoBitrate);
        args.push('-bufsize', `${parseInt(this.profile.videoBitrate) * 2}M`);

        // Audio codec settings
        args.push('-c:a', this.profile.audioCodec);
        args.push('-b:a', this.profile.audioBitrate);
        args.push('-ar', '48000');

        // Output settings
        args.push('-pix_fmt', this.profile.pixelFormat);
        args.push('-movflags', '+faststart');
        args.push('-y');  // Overwrite output
        args.push(outputPath);

        return args;
    }

    /**
     * Get platform profile
     */
    getProfile(): PlatformExportProfile {
        return { ...this.profile };
    }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createFFmpegComposer(
    platform: VideoPlatform,
    captionStyle: CaptionStyle['type']
): FFmpegComposer {
    return new FFmpegComposer(platform, captionStyle);
}
