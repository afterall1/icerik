/**
 * Video Editing Agent
 * Main orchestrator for automated video generation
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffprobePath from '@ffprobe-installer/ffprobe';

import type {
    VideoProject,
    VideoGenerationResult,
    VideoGenerationProgress,
    VideoJobStatus,
    TimelineSection,
    VideoPlatform,
    VideoGenerationOptions
} from './types.js';
import { PLATFORM_PROFILES } from './types.js';
import { TimelineBuilder, createTimelineBuilder } from './TimelineBuilder.js';
import { CaptionGenerator, createCaptionGenerator } from './CaptionGenerator.js';
import { AudioMixer, createAudioMixer } from './AudioMixer.js';
import { FFmpegComposer, createFFmpegComposer } from './FFmpegComposer.js';
import { createChildLogger } from '../utils/logger.js';

// =============================================================================
// Constants
// =============================================================================

const OUTPUT_DIR = 'data/videos';
const TEMP_DIR = 'data/video-temp';
const logger = createChildLogger('video-agent');

// =============================================================================
// Video Editing Agent Class
// =============================================================================

export class VideoEditingAgent {
    private static instance: VideoEditingAgent | null = null;
    private jobs: Map<string, VideoGenerationProgress> = new Map();
    private ffmpegBinary: string;
    private ffprobeBinary: string;

    private constructor() {
        this.ffmpegBinary = ffmpegPath.path;
        this.ffprobeBinary = ffprobePath.path;
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): VideoEditingAgent {
        if (!VideoEditingAgent.instance) {
            VideoEditingAgent.instance = new VideoEditingAgent();
        }
        return VideoEditingAgent.instance;
    }

    /**
     * Generate video from project specification
     */
    async generateVideo(project: VideoProject): Promise<VideoGenerationResult> {
        const jobId = project.id || randomUUID();
        const startTime = Date.now();

        try {
            // Initialize job tracking
            this.updateJobStatus(jobId, 'queued', 0, 'Initializing...');

            // Ensure output directories exist
            await this.ensureDirectories();

            // Step 1: Get audio duration
            this.updateJobStatus(jobId, 'building-timeline', 10, 'Analyzing audio...');
            const audioDuration = await this.getAudioDuration(project.audio.voiceoverPath);

            // Step 2: Build timeline
            this.updateJobStatus(jobId, 'building-timeline', 20, 'Building timeline...');
            const timelineBuilder = createTimelineBuilder(project.options);
            const timeline = timelineBuilder.buildTimeline(
                project.script,
                project.images,
                audioDuration
            );

            // Step 3: Generate captions
            this.updateJobStatus(jobId, 'generating-captions', 40, 'Generating captions...');
            const captionGenerator = createCaptionGenerator(
                project.options.captionStyle,
                project.platform
            );
            const sectionsWithCaptions = captionGenerator.generateCaptions(timeline);

            // Step 4: Compose video
            this.updateJobStatus(jobId, 'composing-video', 60, 'Composing video...');
            const composer = createFFmpegComposer(project.platform, project.options.captionStyle);
            const { filterComplex, inputFiles } = composer.generateFilterComplex(
                sectionsWithCaptions,
                audioDuration
            );

            // Step 5: Setup audio
            const audioMixer = createAudioMixer({
                voiceoverPath: project.audio.voiceoverPath,
                backgroundMusicPath: project.audio.backgroundMusicPath,
                backgroundVolume: project.options.backgroundMusicVolume,
                enableDucking: project.options.audioDucking
            });
            const audioResult = audioMixer.generateAudioFilters();

            // Step 6: Generate output path
            const outputFilename = `${project.platform}_${jobId}.mp4`;
            const outputPath = path.join(OUTPUT_DIR, outputFilename);

            // Step 7: Execute FFmpeg
            this.updateJobStatus(jobId, 'encoding', 70, 'Encoding video...');
            const ffmpegArgs = composer.generateCommandArgs(
                inputFiles,
                filterComplex,
                audioMixer.getAudioInputs(),
                audioResult.mappings[0] || '1:a',
                outputPath
            );

            await this.executeFFmpeg(ffmpegArgs, jobId);

            // Step 8: Get final file info
            this.updateJobStatus(jobId, 'complete', 100, 'Complete!');
            const stats = await fs.stat(outputPath);

            const processingTimeMs = Date.now() - startTime;

            logger.info({
                jobId,
                platform: project.platform,
                duration: audioDuration,
                fileSize: stats.size,
                processingTimeMs
            }, 'Video generation complete');

            return {
                success: true,
                jobId,
                outputPath,
                duration: audioDuration,
                fileSize: stats.size,
                processingTimeMs
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            this.updateJobStatus(jobId, 'failed', 0, `Error: ${errorMessage}`);

            logger.error({
                jobId,
                error: errorMessage
            }, 'Video generation failed');

            return {
                success: false,
                jobId,
                error: errorMessage,
                processingTimeMs: Date.now() - startTime
            };
        }
    }

    /**
     * Get audio duration using ffprobe
     */
    private async getAudioDuration(audioPath: string): Promise<number> {
        return new Promise((resolve, reject) => {
            const args = [
                '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                audioPath
            ];

            const ffprobe = spawn(this.ffprobeBinary, args);
            let output = '';
            let errorOutput = '';

            ffprobe.stdout.on('data', (data) => {
                output += data.toString();
            });

            ffprobe.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            ffprobe.on('close', (code) => {
                if (code === 0) {
                    const duration = parseFloat(output.trim());
                    if (isNaN(duration)) {
                        reject(new Error('Failed to parse audio duration'));
                    } else {
                        resolve(duration);
                    }
                } else {
                    reject(new Error(`ffprobe error: ${errorOutput}`));
                }
            });

            ffprobe.on('error', (err) => {
                reject(new Error(`ffprobe spawn error: ${err.message}`));
            });
        });
    }

    /**
     * Execute FFmpeg command
     */
    private async executeFFmpeg(args: string[], jobId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            logger.debug({ args: args.join(' ') }, 'Executing FFmpeg');

            const ffmpeg = spawn(this.ffmpegBinary, args);
            let errorOutput = '';
            let progressMatch: RegExpMatchArray | null;

            // FFmpeg outputs progress to stderr
            ffmpeg.stderr.on('data', (data) => {
                const output = data.toString();
                errorOutput += output;

                // Parse progress (time=HH:MM:SS.ms)
                progressMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
                if (progressMatch) {
                    const hours = parseInt(progressMatch[1]);
                    const minutes = parseInt(progressMatch[2]);
                    const seconds = parseInt(progressMatch[3]);
                    const currentTime = hours * 3600 + minutes * 60 + seconds;

                    // Update progress (encoding is 70-95% of total)
                    const job = this.jobs.get(jobId);
                    if (job) {
                        job.currentStep = `Encoding: ${currentTime}s processed`;
                    }
                }
            });

            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    // Log last 500 chars of error for debugging
                    const errorSnippet = errorOutput.slice(-500);
                    reject(new Error(`FFmpeg exited with code ${code}: ${errorSnippet}`));
                }
            });

            ffmpeg.on('error', (err) => {
                reject(new Error(`FFmpeg spawn error: ${err.message}`));
            });
        });
    }

    /**
     * Ensure output directories exist
     */
    private async ensureDirectories(): Promise<void> {
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
        await fs.mkdir(TEMP_DIR, { recursive: true });
    }

    /**
     * Update job status
     */
    private updateJobStatus(
        jobId: string,
        status: VideoJobStatus,
        progress: number,
        currentStep: string
    ): void {
        this.jobs.set(jobId, {
            jobId,
            status,
            progress,
            currentStep
        });
    }

    /**
     * Get job progress
     */
    getJobProgress(jobId: string): VideoGenerationProgress | null {
        return this.jobs.get(jobId) || null;
    }

    /**
     * Get all jobs
     */
    getAllJobs(): VideoGenerationProgress[] {
        return Array.from(this.jobs.values());
    }

    /**
     * Clean up completed jobs
     */
    cleanupCompletedJobs(maxAgeMs: number = 3600000): number {
        let cleaned = 0;
        // Note: For full implementation, add timestamp tracking to jobs
        for (const [jobId, job] of this.jobs) {
            if (job.status === 'complete' || job.status === 'failed') {
                this.jobs.delete(jobId);
                cleaned++;
            }
        }
        return cleaned;
    }
}

// =============================================================================
// Factory Function
// =============================================================================

export function getVideoEditingAgent(): VideoEditingAgent {
    return VideoEditingAgent.getInstance();
}

// =============================================================================
// Convenience Exports
// =============================================================================

export { TimelineBuilder, CaptionGenerator, AudioMixer, FFmpegComposer };
export * from './types.js';
