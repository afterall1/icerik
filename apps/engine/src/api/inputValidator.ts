/**
 * Input Validation Schemas for İçerik Trend Engine API
 * 
 * Uses Zod for runtime validation with TypeScript inference.
 * All schemas are designed to be strict and fail-fast.
 * 
 * @module inputValidator
 * @version 1.0.0
 */

import { z } from 'zod';
import type { Context, MiddlewareHandler } from 'hono';
import { CATEGORY_LABELS } from '@icerik/shared';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('validator');

// ============================================
// SHARED SCHEMAS
// ============================================

/** Valid category IDs from shared config */
const CATEGORY_IDS = Object.keys(CATEGORY_LABELS) as [string, ...string[]];

/** Time range options */
const TIME_RANGES = ['hour', 'day', 'week', 'month'] as const;

/** Sort types for Reddit */
const SORT_TYPES = ['hot', 'rising', 'top', 'new'] as const;

/** Sort by options for NES */
const SORT_BY_OPTIONS = ['nes', 'score', 'comments', 'time'] as const;

/** Platform options */
const PLATFORMS = ['tiktok', 'reels', 'shorts'] as const;

/** Tone options */
const TONES = ['casual', 'professional', 'humorous', 'dramatic'] as const;

/** Language options */
const LANGUAGES = ['en', 'tr'] as const;

// ============================================
// API QUERY SCHEMAS
// ============================================

/**
 * Query parameters for /api/trends endpoint
 */
export const trendQuerySchema = z.object({
    category: z.enum(CATEGORY_IDS).optional(),
    timeRange: z.enum(TIME_RANGES).default('day'),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    minScore: z.coerce.number().int().min(0).optional(),
    sortBy: z.enum(SORT_BY_OPTIONS).default('nes'),
    sortType: z.enum(SORT_TYPES).default('hot'),
    subreddit: z.string().regex(/^[a-zA-Z0-9_]+$/, 'Invalid subreddit name').optional(),
    bypass: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
});

export type TrendQueryInput = z.infer<typeof trendQuerySchema>;

/**
 * Query parameters for /api/subreddits endpoint
 */
export const subredditsQuerySchema = z.object({
    category: z.enum(CATEGORY_IDS).optional(),
});

/**
 * Query parameters for /api/ai/metrics endpoint
 */
export const aiMetricsQuerySchema = z.object({
    since: z.coerce.number().int().min(0).optional(),
});

// ============================================
// API BODY SCHEMAS
// ============================================

/**
 * NES breakdown data structure
 */
const nesBreakdownSchema = z.object({
    rawScore: z.number(),
    engagementVelocity: z.number(),
    controversyFactor: z.number(),
    subredditBaseline: z.number(),
});

/**
 * Trend data for script generation
 * Validates the structure of trend objects passed to AI endpoints
 */
export const trendDataSchema = z.object({
    id: z.string().min(1, 'Trend ID is required'),
    title: z.string().min(1).max(500),
    selftext: z.string().max(10000).default(''),
    author: z.string().default('[deleted]'),
    subreddit: z.string().regex(/^[a-zA-Z0-9_]+$/),
    category: z.enum(CATEGORY_IDS),
    score: z.number().int().min(0),
    upvote_ratio: z.number().min(0).max(1),
    num_comments: z.number().int().min(0),
    created_utc: z.number(),
    url: z.string().url().or(z.string().max(0)),
    permalink: z.string(),
    is_video: z.boolean().default(false),
    domain: z.string().default(''),
    over_18: z.boolean().default(false),
    spoiler: z.boolean().default(false),
    stickied: z.boolean().default(false),
    nes: z.number().min(0),
    nesBreakdown: nesBreakdownSchema.optional(),
});

export type TrendDataInput = z.infer<typeof trendDataSchema>;

/**
 * Script generation options
 */
export const scriptOptionsSchema = z.object({
    format: z.string().optional(),
    durationSeconds: z.number().int().min(15).max(180).optional(),
    platform: z.enum([...PLATFORMS, 'all']).optional(),
    tone: z.enum(TONES).optional(),
    language: z.enum(LANGUAGES).optional(),
    includeCta: z.boolean().optional(),
    includeHook: z.boolean().optional(),
});

/**
 * POST /api/generate-script body
 */
export const generateScriptBodySchema = z.object({
    trend: trendDataSchema,
    options: scriptOptionsSchema.optional(),
});

export type GenerateScriptInput = z.infer<typeof generateScriptBodySchema>;

/**
 * POST /api/generate-scripts (multi-platform) body
 */
export const generateScriptsBodySchema = z.object({
    trend: trendDataSchema,
    platforms: z.array(z.enum(PLATFORMS)).min(1).max(3).optional(),
    options: z.object({
        durationSeconds: z.number().int().min(15).max(180).optional(),
        tone: z.enum(TONES).optional(),
        language: z.enum(LANGUAGES).optional(),
        includeCta: z.boolean().optional(),
        includeHook: z.boolean().optional(),
    }).optional(),
});

/**
 * POST /api/cache/invalidate body
 */
export const cacheInvalidateBodySchema = z.object({
    prefix: z.string().min(1).max(50).optional(),
    category: z.enum(CATEGORY_IDS).optional(),
    all: z.literal(true).optional(),
}).refine(
    data => data.prefix || data.category || data.all,
    { message: 'At least one of prefix, category, or all must be specified' }
);

/**
 * POST /api/trends/:id/classify body
 */
export const classifyTrendBodySchema = z.object({
    trend: trendDataSchema,
});

/**
 * POST /api/scripts/score body
 */
export const scoreScriptBodySchema = z.object({
    script: z.object({
        platform: z.enum(PLATFORMS),
        hook: z.string().min(1),
        body: z.string().min(1),
        cta: z.string().optional(),
        title: z.string().optional(),
        hashtags: z.array(z.string()).optional(),
        estimatedDuration: z.number().optional(),
        wordCount: z.number().optional(),
    }),
});

/**
 * Iteration targets for script refinement
 */
const ITERATION_TARGETS = [
    'hook', 'body', 'cta', 'title', 'hashtags',
    'shorten', 'lengthen', 'change_tone', 'add_hooks'
] as const;

/**
 * POST /api/scripts/iterate body
 */
export const iterateScriptBodySchema = z.object({
    originalScript: z.object({
        platform: z.enum(PLATFORMS),
        hook: z.string().min(1),
        body: z.string().min(1),
        cta: z.string().optional(),
        title: z.string().optional(),
        hashtags: z.array(z.string()).optional(),
    }),
    target: z.enum(ITERATION_TARGETS),
    newTone: z.enum(TONES).optional(),
    additionalInstructions: z.string().max(500).optional(),
});

/**
 * Variant styles for A/B testing
 */
const VARIANT_STYLES = [
    'high_energy', 'story_driven', 'educational',
    'controversial', 'minimal', 'humorous'
] as const;

/**
 * POST /api/generate-script-variants body
 */
export const generateVariantsBodySchema = z.object({
    trend: trendDataSchema,
    platform: z.enum(PLATFORMS),
    styles: z.array(z.enum(VARIANT_STYLES)).min(1).max(4).optional(),
    durationSeconds: z.number().int().min(15).max(180).optional(),
    tone: z.enum(TONES).optional(),
    calculateScores: z.boolean().optional(),
});

// ============================================
// VOICE GENERATION SCHEMAS
// ============================================

/** Voice provider options */
const VOICE_PROVIDERS = ['elevenlabs', 'fishaudio'] as const;

/**
 * Voice settings for generation
 */
export const voiceSettingsSchema = z.object({
    stability: z.number().min(0).max(1).optional(),
    similarityBoost: z.number().min(0).max(1).optional(),
    speed: z.number().min(0.5).max(2).optional(),
    style: z.number().min(0).max(1).optional(),
});

/**
 * POST /api/voice/generate body
 */
export const generateVoiceBodySchema = z.object({
    text: z.string().min(1, 'Text is required').max(10000, 'Text too long (max 10,000 characters)'),
    voiceId: z.string().min(1, 'Voice ID is required'),
    provider: z.enum(VOICE_PROVIDERS).optional(),
    settings: voiceSettingsSchema.optional(),
    format: z.enum(['mp3', 'wav', 'ogg']).optional(),
});

export type GenerateVoiceInput = z.infer<typeof generateVoiceBodySchema>;

/**
 * Query parameters for /api/voice/list endpoint
 */
export const voiceListQuerySchema = z.object({
    provider: z.enum(VOICE_PROVIDERS).optional(),
});

// ============================================
// VALIDATION MIDDLEWARE FACTORY
// ============================================

type SchemaType = 'query' | 'body' | 'param';

interface ValidationOptions<T extends z.ZodType> {
    /** The Zod schema to validate against */
    schema: T;
    /** Where to find the data to validate */
    type: SchemaType;
    /** Custom error message prefix */
    errorPrefix?: string;
}

/**
 * Creates a validation middleware for the given schema
 * 
 * @example
 * ```ts
 * app.get('/trends', validateRequest({ 
 *   schema: trendQuerySchema, 
 *   type: 'query' 
 * }), handler);
 * ```
 */
export function validateRequest<T extends z.ZodType>(
    options: ValidationOptions<T>
): MiddlewareHandler {
    const { schema, type, errorPrefix = 'Validation error' } = options;

    return async (c: Context, next): Promise<Response | void> => {
        let data: unknown;

        switch (type) {
            case 'query':
                data = c.req.query();
                break;
            case 'body':
                try {
                    data = await c.req.json();
                } catch {
                    return c.json({
                        success: false,
                        error: 'Invalid JSON body',
                        timestamp: new Date().toISOString(),
                    }, 400);
                }
                break;
            case 'param':
                data = c.req.param();
                break;
        }

        const result = schema.safeParse(data);

        if (!result.success) {
            const errors = result.error.flatten();

            logger.warn({
                path: c.req.path,
                type,
                errors: errors.fieldErrors,
            }, 'Validation failed');

            return c.json({
                success: false,
                error: errorPrefix,
                details: errors.fieldErrors,
                timestamp: new Date().toISOString(),
            }, 400);
        }

        // Store validated data for handler access
        c.set('validatedData', result.data);
        await next();
        return;
    };
}

/**
 * Helper to get validated data from context
 * Type-safe extraction of validated request data
 */
export function getValidatedData<T>(c: Context): T {
    return c.get('validatedData') as T;
}

// ============================================
// SANITIZATION HELPERS
// ============================================

/**
 * Sanitize string input to prevent XSS in responses
 * Removes potential HTML/script content
 */
export function sanitizeString(input: string): string {
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize subreddit name
 * Only allows alphanumeric and underscores
 */
export function sanitizeSubreddit(name: string): string | null {
    const cleaned = name.trim().toLowerCase();
    if (/^[a-z0-9_]{1,21}$/.test(cleaned)) {
        return cleaned;
    }
    return null;
}

// ============================================
// EXPORTS
// ============================================

export {
    CATEGORY_IDS,
    TIME_RANGES,
    SORT_TYPES,
    SORT_BY_OPTIONS,
    PLATFORMS,
    TONES,
    LANGUAGES,
    ITERATION_TARGETS,
    VARIANT_STYLES,
    VOICE_PROVIDERS,
};
