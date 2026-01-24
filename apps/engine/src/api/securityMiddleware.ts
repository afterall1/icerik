/**
 * Security Middleware for İçerik Trend Engine
 * 
 * Implements:
 * - Security headers (X-Frame-Options, CSP hints, etc.)
 * - IP-based rate limiting with sliding window
 * - Request size limits
 * - Error response sanitization
 * 
 * @module securityMiddleware
 * @version 1.0.0
 */

import type { Context, Next, MiddlewareHandler } from 'hono';
import { createChildLogger } from '../utils/logger.js';
import { getEnv } from '../utils/env.js';

const logger = createChildLogger('security');

// ============================================
// TYPES
// ============================================

interface RateLimiterConfig {
    /** Maximum requests allowed in the window */
    maxRequests: number;
    /** Time window in milliseconds */
    windowMs: number;
    /** Custom key extractor (defaults to IP) */
    keyExtractor?: (c: Context) => string;
    /** Skip rate limiting for certain requests */
    skip?: (c: Context) => boolean;
}

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

interface SecurityHeadersConfig {
    /** Enable HSTS (only for HTTPS) */
    enableHsts?: boolean;
    /** Custom CSP directives */
    cspDirectives?: string;
}

// ============================================
// RATE LIMITER
// ============================================

/**
 * In-memory rate limiter with sliding window algorithm.
 * 
 * Design decisions:
 * - Uses Map for O(1) lookups
 * - Automatic cleanup of expired entries
 * - IP-based by default, configurable key extraction
 */
class RateLimiter {
    private readonly store = new Map<string, RateLimitEntry>();
    private readonly config: Required<RateLimiterConfig>;
    private cleanupInterval: ReturnType<typeof setInterval> | null = null;

    constructor(config: RateLimiterConfig) {
        this.config = {
            maxRequests: config.maxRequests,
            windowMs: config.windowMs,
            keyExtractor: config.keyExtractor ?? this.defaultKeyExtractor,
            skip: config.skip ?? (() => false),
        };

        // Cleanup expired entries every minute
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }

    /**
     * Default key extractor - uses client IP with fallbacks
     */
    private defaultKeyExtractor(c: Context): string {
        // Try various headers for real IP (behind proxy)
        const forwarded = c.req.header('x-forwarded-for');
        if (forwarded) {
            // Take the first IP in the chain (original client)
            return forwarded.split(',')[0].trim();
        }

        const realIp = c.req.header('x-real-ip');
        if (realIp) {
            return realIp;
        }

        // Fallback to connection info (may not be available in all environments)
        return 'unknown';
    }

    /**
     * Check if request should be rate limited
     * @returns Object with allowed status and remaining info
     */
    check(c: Context): { allowed: boolean; remaining: number; resetAt: number } {
        if (this.config.skip(c)) {
            return { allowed: true, remaining: this.config.maxRequests, resetAt: 0 };
        }

        const key = this.config.keyExtractor(c);
        const now = Date.now();
        const entry = this.store.get(key);

        // No entry or expired - create new
        if (!entry || now >= entry.resetAt) {
            const newEntry: RateLimitEntry = {
                count: 1,
                resetAt: now + this.config.windowMs,
            };
            this.store.set(key, newEntry);
            return {
                allowed: true,
                remaining: this.config.maxRequests - 1,
                resetAt: newEntry.resetAt,
            };
        }

        // Entry exists and not expired
        if (entry.count >= this.config.maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: entry.resetAt,
            };
        }

        // Increment count
        entry.count++;
        return {
            allowed: true,
            remaining: this.config.maxRequests - entry.count,
            resetAt: entry.resetAt,
        };
    }

    /**
     * Remove expired entries to prevent memory leaks
     */
    private cleanup(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.store.entries()) {
            if (now >= entry.resetAt) {
                this.store.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug({ cleaned, remaining: this.store.size }, 'Rate limiter cleanup');
        }
    }

    /**
     * Destroy the rate limiter (cleanup interval)
     */
    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.store.clear();
    }

    /**
     * Get current stats for monitoring
     */
    getStats(): { activeKeys: number; config: { maxRequests: number; windowMs: number } } {
        return {
            activeKeys: this.store.size,
            config: {
                maxRequests: this.config.maxRequests,
                windowMs: this.config.windowMs,
            },
        };
    }
}

// ============================================
// MIDDLEWARE FACTORIES
// ============================================

/**
 * Creates rate limiting middleware
 * 
 * @example
 * ```ts
 * const limiter = createRateLimiter({ maxRequests: 100, windowMs: 60000 });
 * app.use('/api/*', limiter);
 * ```
 */
export function createRateLimiter(config: RateLimiterConfig): MiddlewareHandler {
    const limiter = new RateLimiter(config);

    return async (c: Context, next: Next): Promise<Response | void> => {
        const result = limiter.check(c);

        // Set rate limit headers
        c.header('X-RateLimit-Limit', config.maxRequests.toString());
        c.header('X-RateLimit-Remaining', result.remaining.toString());
        c.header('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString());

        if (!result.allowed) {
            const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
            c.header('Retry-After', retryAfter.toString());

            logger.warn({
                ip: c.req.header('x-forwarded-for') || 'unknown',
                path: c.req.path,
                retryAfter,
            }, 'Rate limit exceeded');

            return c.json({
                success: false,
                error: 'Too many requests. Please try again later.',
                retryAfter,
                timestamp: new Date().toISOString(),
            }, 429);
        }

        await next();
        return;
    };
}

/**
 * Creates security headers middleware
 * 
 * Headers added:
 * - X-Content-Type-Options: nosniff
 * - X-Frame-Options: DENY
 * - X-XSS-Protection: 1; mode=block
 * - Referrer-Policy: strict-origin-when-cross-origin
 * - Strict-Transport-Security (optional, for HTTPS)
 */
export function createSecurityHeaders(config: SecurityHeadersConfig = {}): MiddlewareHandler {
    return async (c: Context, next: Next): Promise<void> => {
        // Prevent MIME type sniffing
        c.header('X-Content-Type-Options', 'nosniff');

        // Prevent clickjacking
        c.header('X-Frame-Options', 'DENY');

        // Enable browser XSS filter
        c.header('X-XSS-Protection', '1; mode=block');

        // Control referrer information
        c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Prevent caching of sensitive responses
        c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        c.header('Pragma', 'no-cache');
        c.header('Expires', '0');

        // HSTS for production HTTPS
        if (config.enableHsts) {
            c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        // Optional custom CSP
        if (config.cspDirectives) {
            c.header('Content-Security-Policy', config.cspDirectives);
        }

        await next();
    };
}

/**
 * Creates error sanitization middleware
 * 
 * In production:
 * - Hides stack traces
 * - Returns generic error messages
 * - Logs full error server-side
 * 
 * In development:
 * - Returns full error details
 */
export function createErrorHandler(): MiddlewareHandler {
    const env = getEnv();
    const isProduction = env.NODE_ENV === 'production';

    return async (c: Context, next: Next): Promise<Response | void> => {
        try {
            await next();
            return;
        } catch (error) {
            const errorId = crypto.randomUUID().slice(0, 8);

            // Always log full error server-side
            logger.error({
                errorId,
                error: error instanceof Error ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                } : error,
                path: c.req.path,
                method: c.req.method,
            }, 'Unhandled error in request');

            // Determine response based on environment
            if (isProduction) {
                return c.json({
                    success: false,
                    error: 'An internal error occurred. Please try again later.',
                    errorId, // Allow correlation with logs
                    timestamp: new Date().toISOString(),
                }, 500);
            }

            // Development: full error details
            return c.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                errorId,
                timestamp: new Date().toISOString(),
            }, 500);
        }
    };
}

/**
 * Creates request size limit middleware
 * 
 * @param maxSizeBytes Maximum allowed request body size
 */
export function createBodySizeLimit(maxSizeBytes: number = 102400): MiddlewareHandler {
    return async (c: Context, next: Next): Promise<Response | void> => {
        const contentLength = c.req.header('content-length');

        if (contentLength) {
            const size = parseInt(contentLength, 10);
            if (!isNaN(size) && size > maxSizeBytes) {
                logger.warn({
                    size,
                    maxSize: maxSizeBytes,
                    path: c.req.path,
                }, 'Request body too large');

                return c.json({
                    success: false,
                    error: `Request body too large. Maximum size: ${Math.round(maxSizeBytes / 1024)}KB`,
                    timestamp: new Date().toISOString(),
                }, 413);
            }
        }

        await next();
        return;
    };
}

// ============================================
// COMBINED SECURITY MIDDLEWARE
// ============================================

interface SecurityMiddlewareOptions {
    /** Enable HSTS headers */
    enableHsts?: boolean;
    /** Rate limit for general endpoints */
    generalRateLimit?: RateLimiterConfig;
    /** Rate limit for AI endpoints */
    aiRateLimit?: RateLimiterConfig;
    /** Maximum request body size in bytes */
    maxBodySize?: number;
}

/**
 * Creates a complete security middleware stack
 * 
 * Returns individual middleware handlers that can be applied selectively
 */
export function createSecurityMiddleware(options: SecurityMiddlewareOptions = {}) {
    const {
        enableHsts = false,
        generalRateLimit = { maxRequests: 100, windowMs: 60000 },
        aiRateLimit = { maxRequests: 20, windowMs: 60000 },
        maxBodySize = 102400, // 100KB
    } = options;

    return {
        /** Security headers middleware */
        headers: () => createSecurityHeaders({ enableHsts }),

        /** Error sanitization middleware */
        errorHandler: () => createErrorHandler(),

        /** Body size limit middleware */
        bodyLimit: () => createBodySizeLimit(maxBodySize),

        /** General rate limiter (100/min default) */
        generalLimiter: () => createRateLimiter(generalRateLimit),

        /** AI-specific rate limiter (20/min default) */
        aiLimiter: () => createRateLimiter(aiRateLimit),
    };
}

// ============================================
// EXPORTS
// ============================================

export type { RateLimiterConfig, SecurityHeadersConfig, SecurityMiddlewareOptions };
