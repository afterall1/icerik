/**
 * Security Event Logger for İçerik Trend Engine
 * 
 * Specialized logging for security-related events:
 * - Rate limit violations
 * - Invalid input attempts
 * - Suspicious patterns
 * - Authentication failures (future)
 * 
 * @module securityLogger
 * @version 1.0.0
 */

import { createChildLogger } from './logger.js';

const logger = createChildLogger('security');

// ============================================
// TYPES
// ============================================

export type SecurityEventType =
    | 'rate_limit_exceeded'
    | 'invalid_input'
    | 'validation_failed'
    | 'suspicious_request'
    | 'large_request_blocked'
    | 'cors_violation'
    | 'api_error'
    | 'auth_required'
    | 'auth_failed';

export interface SecurityEvent {
    /** Type of security event */
    type: SecurityEventType;
    /** Client IP address */
    ip: string;
    /** Request path */
    path: string;
    /** HTTP method */
    method?: string;
    /** User agent string */
    userAgent?: string;
    /** Additional context */
    details?: Record<string, unknown>;
}

export interface SecurityEventStats {
    totalEvents: number;
    eventsByType: Record<SecurityEventType, number>;
    topIps: Array<{ ip: string; count: number }>;
    lastHourEvents: number;
}

// ============================================
// IN-MEMORY EVENT STORE (for stats)
// ============================================

interface StoredEvent extends SecurityEvent {
    timestamp: number;
}

class SecurityEventStore {
    private events: StoredEvent[] = [];
    private readonly maxEvents = 1000;
    private readonly retentionMs = 3600000; // 1 hour

    add(event: SecurityEvent): void {
        const storedEvent: StoredEvent = {
            ...event,
            timestamp: Date.now(),
        };

        this.events.push(storedEvent);

        // Trim if over max
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(-this.maxEvents);
        }
    }

    getStats(): SecurityEventStats {
        const now = Date.now();
        const oneHourAgo = now - this.retentionMs;

        // Filter to last hour
        const recentEvents = this.events.filter(e => e.timestamp >= oneHourAgo);

        // Count by type
        const eventsByType: Record<string, number> = {};
        const ipCounts: Record<string, number> = {};

        for (const event of recentEvents) {
            eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
            ipCounts[event.ip] = (ipCounts[event.ip] || 0) + 1;
        }

        // Get top IPs
        const topIps = Object.entries(ipCounts)
            .map(([ip, count]) => ({ ip, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return {
            totalEvents: this.events.length,
            eventsByType: eventsByType as Record<SecurityEventType, number>,
            topIps,
            lastHourEvents: recentEvents.length,
        };
    }

    cleanup(): number {
        const oneHourAgo = Date.now() - this.retentionMs;
        const before = this.events.length;
        this.events = this.events.filter(e => e.timestamp >= oneHourAgo);
        return before - this.events.length;
    }
}

const eventStore = new SecurityEventStore();

// Cleanup old events every 10 minutes
setInterval(() => {
    const cleaned = eventStore.cleanup();
    if (cleaned > 0) {
        logger.debug({ cleaned }, 'Security event store cleanup');
    }
}, 600000);

// ============================================
// LOGGING FUNCTIONS
// ============================================

/**
 * Log a security event
 * 
 * @example
 * ```ts
 * logSecurityEvent({
 *   type: 'rate_limit_exceeded',
 *   ip: '192.168.1.1',
 *   path: '/api/generate-script',
 *   details: { retryAfter: 30 }
 * });
 * ```
 */
export function logSecurityEvent(event: SecurityEvent): void {
    // Store for stats
    eventStore.add(event);

    // Log based on severity
    switch (event.type) {
        case 'rate_limit_exceeded':
        case 'large_request_blocked':
            logger.warn({
                ...event,
                timestamp: new Date().toISOString(),
            }, `Security: ${event.type}`);
            break;

        case 'suspicious_request':
        case 'auth_failed':
            logger.error({
                ...event,
                timestamp: new Date().toISOString(),
            }, `Security: ${event.type}`);
            break;

        case 'invalid_input':
        case 'validation_failed':
        case 'cors_violation':
        case 'api_error':
        case 'auth_required':
        default:
            logger.info({
                ...event,
                timestamp: new Date().toISOString(),
            }, `Security: ${event.type}`);
            break;
    }
}

/**
 * Log a rate limit exceeded event
 */
export function logRateLimitExceeded(
    ip: string,
    path: string,
    retryAfter: number
): void {
    logSecurityEvent({
        type: 'rate_limit_exceeded',
        ip,
        path,
        details: { retryAfter },
    });
}

/**
 * Log an invalid input event
 */
export function logInvalidInput(
    ip: string,
    path: string,
    errors: Record<string, unknown>
): void {
    logSecurityEvent({
        type: 'invalid_input',
        ip,
        path,
        details: { errors },
    });
}

/**
 * Log a suspicious request pattern
 */
export function logSuspiciousRequest(
    ip: string,
    path: string,
    reason: string,
    details?: Record<string, unknown>
): void {
    logSecurityEvent({
        type: 'suspicious_request',
        ip,
        path,
        details: { reason, ...details },
    });
}

/**
 * Get security event statistics
 */
export function getSecurityStats(): SecurityEventStats {
    return eventStore.getStats();
}

// ============================================
// PATTERN DETECTION
// ============================================

/**
 * Check for suspicious patterns in a request
 * Returns array of detected patterns
 */
export function detectSuspiciousPatterns(
    path: string,
    query: Record<string, string>,
    body?: unknown
): string[] {
    const patterns: string[] = [];

    // SQL injection patterns
    const sqlPatterns = [
        /'\s*OR\s*'1'\s*=\s*'1/i,
        /;\s*DROP\s+TABLE/i,
        /UNION\s+SELECT/i,
        /--\s*$/,
    ];

    const checkString = (str: string): void => {
        for (const pattern of sqlPatterns) {
            if (pattern.test(str)) {
                patterns.push('sql_injection_attempt');
                break;
            }
        }
    };

    // Check path
    checkString(path);

    // Check query params
    for (const value of Object.values(query)) {
        checkString(value);
    }

    // Check body if present and string
    if (typeof body === 'string') {
        checkString(body);
    } else if (body && typeof body === 'object') {
        const bodyStr = JSON.stringify(body);
        checkString(bodyStr);
    }

    // XSS patterns
    const xssPatterns = [
        /<script\b/i,
        /javascript:/i,
        /on\w+\s*=/i,
    ];

    const checkXss = (str: string): void => {
        for (const pattern of xssPatterns) {
            if (pattern.test(str)) {
                patterns.push('xss_attempt');
                break;
            }
        }
    };

    checkXss(path);
    for (const value of Object.values(query)) {
        checkXss(value);
    }

    // Path traversal
    if (path.includes('..') || path.includes('%2e%2e')) {
        patterns.push('path_traversal_attempt');
    }

    return [...new Set(patterns)]; // Dedupe
}
