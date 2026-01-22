import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('rate-limiter');

interface RateLimiterConfig {
    maxRequestsPerMinute: number;
    minDelayMs: number;
    maxBackoffMs: number;
}

interface RateLimiterState {
    requestLog: number[];
    backoffMultiplier: number;
    lastRequestTime: number;
    consecutiveErrors: number;
}

/**
 * Token Bucket Rate Limiter for Reddit .json Endpoints
 * Implements exponential backoff with circuit breaker pattern
 */
export class RateLimiter {
    private readonly config: RateLimiterConfig;
    private state: RateLimiterState;

    constructor(config: Partial<RateLimiterConfig> = {}) {
        this.config = {
            maxRequestsPerMinute: config.maxRequestsPerMinute ?? 8, // Conservative: stay under 10 QPM
            minDelayMs: config.minDelayMs ?? 7500, // ~8 requests per minute
            maxBackoffMs: config.maxBackoffMs ?? 60000, // Max 1 minute backoff
        };

        this.state = {
            requestLog: [],
            backoffMultiplier: 1,
            lastRequestTime: 0,
            consecutiveErrors: 0,
        };

        logger.info({ config: this.config }, 'Rate limiter initialized');
    }

    /**
     * Wait for rate limit clearance before making a request
     */
    async waitForSlot(): Promise<void> {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;

        // Clean old entries
        this.state.requestLog = this.state.requestLog.filter(t => t > oneMinuteAgo);

        // Check circuit breaker - if too many consecutive errors, wait longer
        if (this.state.consecutiveErrors >= 3) {
            const circuitBreakerDelay = Math.min(
                this.config.maxBackoffMs,
                30000 * Math.pow(2, this.state.consecutiveErrors - 3)
            );
            logger.warn(
                { consecutiveErrors: this.state.consecutiveErrors, delay: circuitBreakerDelay },
                'Circuit breaker active, waiting before retry'
            );
            await this.sleep(circuitBreakerDelay);
        }

        // Check if we're over the limit
        if (this.state.requestLog.length >= this.config.maxRequestsPerMinute) {
            const oldestRequest = this.state.requestLog[0];
            const waitTime = Math.min(
                (oldestRequest + 60000 - now) * this.state.backoffMultiplier,
                this.config.maxBackoffMs
            );

            logger.warn(
                { waitTime, backoffMultiplier: this.state.backoffMultiplier },
                'Rate limit reached, waiting'
            );
            await this.sleep(waitTime);

            // Increase backoff for next time
            this.state.backoffMultiplier = Math.min(this.state.backoffMultiplier * 1.5, 5);
        } else {
            // Reset backoff on successful slot acquisition
            this.state.backoffMultiplier = 1;
        }

        // Ensure minimum delay between requests
        const timeSinceLastRequest = now - this.state.lastRequestTime;
        if (timeSinceLastRequest < this.config.minDelayMs) {
            await this.sleep(this.config.minDelayMs - timeSinceLastRequest);
        }

        this.state.requestLog.push(Date.now());
        this.state.lastRequestTime = Date.now();
    }

    /**
     * Record a successful request - resets error counter
     */
    recordSuccess(): void {
        this.state.consecutiveErrors = 0;
        this.state.backoffMultiplier = Math.max(1, this.state.backoffMultiplier * 0.8);
    }

    /**
     * Record a rate limit error (429 response)
     */
    recordRateLimitHit(): void {
        this.state.consecutiveErrors++;
        this.state.backoffMultiplier = Math.min(this.state.backoffMultiplier * 2, 5);
        logger.warn(
            {
                backoffMultiplier: this.state.backoffMultiplier,
                consecutiveErrors: this.state.consecutiveErrors,
            },
            'Rate limit hit, increasing backoff'
        );
    }

    /**
     * Record a general error
     */
    recordError(): void {
        this.state.consecutiveErrors++;
    }

    /**
     * Get current rate limit status
     */
    getStatus(): {
        requestsInLastMinute: number;
        backoffMultiplier: number;
        consecutiveErrors: number;
        isHealthy: boolean;
    } {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        this.state.requestLog = this.state.requestLog.filter(t => t > oneMinuteAgo);

        return {
            requestsInLastMinute: this.state.requestLog.length,
            backoffMultiplier: this.state.backoffMultiplier,
            consecutiveErrors: this.state.consecutiveErrors,
            isHealthy: this.state.consecutiveErrors < 3,
        };
    }

    /**
     * Reset the rate limiter state (useful for testing)
     */
    reset(): void {
        this.state = {
            requestLog: [],
            backoffMultiplier: 1,
            lastRequestTime: 0,
            consecutiveErrors: 0,
        };
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Singleton instance
let rateLimiterInstance: RateLimiter | null = null;

export function getRateLimiter(config?: Partial<RateLimiterConfig>): RateLimiter {
    if (!rateLimiterInstance) {
        rateLimiterInstance = new RateLimiter(config);
    }
    return rateLimiterInstance;
}
