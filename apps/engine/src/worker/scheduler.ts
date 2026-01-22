/**
 * Polling Scheduler
 * 
 * Manages tier-based polling intervals for subreddit data fetching.
 * Implements intelligent scheduling to optimize API usage.
 * 
 * @module worker/scheduler
 */

import { SUBREDDIT_CONFIG, POLL_INTERVALS } from '@icerik/shared';
import type { SubredditConfig } from '@icerik/shared';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('scheduler');

/**
 * Scheduled job structure
 */
export interface ScheduledJob {
    /** Unique job identifier */
    id: string;
    /** List of subreddits to poll in this job */
    subreddits: SubredditConfig[];
    /** Polling interval in milliseconds */
    intervalMs: number;
    /** Tier number (1, 2, or 3) */
    tier: 1 | 2 | 3;
    /** Whether job is currently active */
    active: boolean;
    /** Last execution time */
    lastRun: Date | null;
    /** Next scheduled execution time */
    nextRun: Date;
    /** Timer reference for cleanup */
    timer: NodeJS.Timeout | null;
    /** Number of successful runs */
    successCount: number;
    /** Number of failed runs */
    failureCount: number;
}

/**
 * Job execution callback type
 */
export type JobCallback = (subreddits: SubredditConfig[]) => Promise<void>;

/**
 * Scheduler configuration options
 */
export interface SchedulerOptions {
    /** Whether to start jobs immediately on creation */
    autoStart: boolean;
    /** Jitter percentage to add randomness to intervals (0-100) */
    jitterPercent: number;
    /** Maximum retries on job failure */
    maxRetries: number;
    /** Delay between retries in milliseconds */
    retryDelayMs: number;
}

/**
 * Default scheduler options
 */
const DEFAULT_OPTIONS: SchedulerOptions = {
    autoStart: false,
    jitterPercent: 10,
    maxRetries: 3,
    retryDelayMs: 5000,
};

/**
 * Polling Scheduler Class
 * 
 * Manages tier-based polling with configurable intervals.
 * Groups subreddits by tier and schedules polling jobs accordingly.
 */
export class PollingScheduler {
    private jobs: Map<string, ScheduledJob> = new Map();
    private callback: JobCallback | null = null;
    private options: SchedulerOptions;
    private isRunning: boolean = false;

    constructor(options: Partial<SchedulerOptions> = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Sets the callback function to execute when a job runs
     * @param callback - Function to call with subreddits when job executes
     */
    setCallback(callback: JobCallback): void {
        this.callback = callback;
    }

    /**
     * Initializes jobs based on subreddit configuration
     * Groups subreddits by tier and creates jobs for each tier
     */
    initialize(): void {
        logger.info('Initializing scheduler...');

        // Group subreddits by tier
        const tiers = new Map<1 | 2 | 3, SubredditConfig[]>();

        for (const subreddit of SUBREDDIT_CONFIG) {
            const tier = subreddit.tier;
            if (!tiers.has(tier)) {
                tiers.set(tier, []);
            }
            tiers.get(tier)!.push(subreddit);
        }

        // Create jobs for each tier
        for (const [tier, subreddits] of tiers) {
            const intervalMs = POLL_INTERVALS[tier];
            const jobId = `tier-${tier}`;

            const job: ScheduledJob = {
                id: jobId,
                subreddits,
                intervalMs,
                tier,
                active: false,
                lastRun: null,
                nextRun: new Date(Date.now() + this.addJitter(intervalMs)),
                timer: null,
                successCount: 0,
                failureCount: 0,
            };

            this.jobs.set(jobId, job);

            logger.info({
                jobId,
                tier,
                subredditCount: subreddits.length,
                intervalMinutes: intervalMs / (60 * 1000),
            }, 'Created polling job');
        }

        if (this.options.autoStart) {
            this.startAll();
        }
    }

    /**
     * Adds random jitter to interval to prevent thundering herd
     * @param intervalMs - Base interval in milliseconds
     * @returns Interval with jitter applied
     */
    private addJitter(intervalMs: number): number {
        const jitterRange = intervalMs * (this.options.jitterPercent / 100);
        const jitter = Math.random() * jitterRange - jitterRange / 2;
        return Math.round(intervalMs + jitter);
    }

    /**
     * Starts all polling jobs
     */
    startAll(): void {
        if (this.isRunning) {
            logger.warn('Scheduler is already running');
            return;
        }

        if (!this.callback) {
            throw new Error('No callback set. Call setCallback() before starting.');
        }

        logger.info('Starting all polling jobs...');
        this.isRunning = true;

        for (const job of this.jobs.values()) {
            this.startJob(job);
        }
    }

    /**
     * Starts a specific job
     * @param job - Job to start
     */
    private startJob(job: ScheduledJob): void {
        if (job.active) {
            return;
        }

        job.active = true;

        // Execute immediately on start, then schedule next run
        this.executeJob(job);

        // Schedule recurring execution
        job.timer = setInterval(() => {
            this.executeJob(job);
        }, this.addJitter(job.intervalMs));

        logger.info({ jobId: job.id }, 'Job started');
    }

    /**
     * Executes a job with retry logic
     * @param job - Job to execute
     * @param retryCount - Current retry attempt
     */
    private async executeJob(job: ScheduledJob, retryCount: number = 0): Promise<void> {
        if (!this.callback || !job.active) {
            return;
        }

        const startTime = Date.now();

        try {
            logger.debug({
                jobId: job.id,
                subredditCount: job.subreddits.length
            }, 'Executing job...');

            await this.callback(job.subreddits);

            const duration = Date.now() - startTime;
            job.lastRun = new Date();
            job.nextRun = new Date(Date.now() + job.intervalMs);
            job.successCount++;

            logger.info({
                jobId: job.id,
                durationMs: duration,
                successCount: job.successCount,
            }, 'Job completed successfully');

        } catch (error) {
            job.failureCount++;

            logger.error({
                error,
                jobId: job.id,
                retryCount,
                failureCount: job.failureCount,
            }, 'Job execution failed');

            // Retry logic
            if (retryCount < this.options.maxRetries) {
                logger.info({
                    jobId: job.id,
                    nextRetryIn: this.options.retryDelayMs,
                    attempt: retryCount + 1,
                    maxRetries: this.options.maxRetries,
                }, 'Scheduling retry...');

                setTimeout(() => {
                    this.executeJob(job, retryCount + 1);
                }, this.options.retryDelayMs * (retryCount + 1)); // Exponential backoff
            }
        }
    }

    /**
     * Stops all polling jobs
     */
    stopAll(): void {
        if (!this.isRunning) {
            logger.warn('Scheduler is not running');
            return;
        }

        logger.info('Stopping all polling jobs...');

        for (const job of this.jobs.values()) {
            this.stopJob(job);
        }

        this.isRunning = false;
    }

    /**
     * Stops a specific job
     * @param job - Job to stop
     */
    private stopJob(job: ScheduledJob): void {
        if (job.timer) {
            clearInterval(job.timer);
            job.timer = null;
        }
        job.active = false;
        logger.info({ jobId: job.id }, 'Job stopped');
    }

    /**
     * Gets the status of all jobs
     * @returns Array of job status objects
     */
    getStatus(): Array<{
        id: string;
        tier: number;
        subredditCount: number;
        intervalMinutes: number;
        active: boolean;
        lastRun: string | null;
        nextRun: string;
        successCount: number;
        failureCount: number;
    }> {
        return Array.from(this.jobs.values()).map(job => ({
            id: job.id,
            tier: job.tier,
            subredditCount: job.subreddits.length,
            intervalMinutes: job.intervalMs / (60 * 1000),
            active: job.active,
            lastRun: job.lastRun?.toISOString() || null,
            nextRun: job.nextRun.toISOString(),
            successCount: job.successCount,
            failureCount: job.failureCount,
        }));
    }

    /**
     * Checks if scheduler is currently running
     */
    isActive(): boolean {
        return this.isRunning;
    }

    /**
     * Forces immediate execution of a specific tier
     * @param tier - Tier to execute immediately
     */
    async forceRun(tier: 1 | 2 | 3): Promise<void> {
        const job = this.jobs.get(`tier-${tier}`);
        if (!job) {
            throw new Error(`Job for tier ${tier} not found`);
        }

        if (!this.callback) {
            throw new Error('No callback set');
        }

        logger.info({ tier }, 'Force running tier...');
        await this.executeJob(job);
    }

    /**
     * Gets aggregate statistics
     */
    getStats(): {
        totalJobs: number;
        activeJobs: number;
        totalSubreddits: number;
        totalSuccesses: number;
        totalFailures: number;
        isRunning: boolean;
    } {
        let activeJobs = 0;
        let totalSubreddits = 0;
        let totalSuccesses = 0;
        let totalFailures = 0;

        for (const job of this.jobs.values()) {
            if (job.active) activeJobs++;
            totalSubreddits += job.subreddits.length;
            totalSuccesses += job.successCount;
            totalFailures += job.failureCount;
        }

        return {
            totalJobs: this.jobs.size,
            activeJobs,
            totalSubreddits,
            totalSuccesses,
            totalFailures,
            isRunning: this.isRunning,
        };
    }
}

/**
 * Singleton scheduler instance
 */
let schedulerInstance: PollingScheduler | null = null;

/**
 * Gets the singleton scheduler instance
 * @param options - Optional configuration options
 * @returns PollingScheduler instance
 */
export function getScheduler(options?: Partial<SchedulerOptions>): PollingScheduler {
    if (!schedulerInstance) {
        schedulerInstance = new PollingScheduler(options);
    }
    return schedulerInstance;
}

/**
 * Resets the scheduler instance (for testing)
 */
export function resetScheduler(): void {
    if (schedulerInstance) {
        schedulerInstance.stopAll();
        schedulerInstance = null;
    }
}
