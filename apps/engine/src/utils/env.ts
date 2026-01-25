import { z } from 'zod';

const envSchema = z.object({
    REDDIT_USER_AGENT: z.string().default('TrendEngine/1.0 (Content Automation Tool)'),
    REDIS_URL: z.string().optional(),
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    POLL_INTERVAL_MS: z.coerce.number().default(300000),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    GEMINI_API_KEY: z.string().optional(),
    // Security-related env vars
    CORS_ORIGINS: z.string().optional(), // Comma-separated list of allowed origins
    API_SECRET_KEY: z.string().min(32).optional(), // Optional API key for auth
    // Image Discovery
    PEXELS_API_KEY: z.string().optional(), // Pexels API key for image search
    // Voice Generation (TTS)
    ELEVENLABS_API_KEY: z.string().optional(), // ElevenLabs API key for TTS
    FISHAUDIO_API_KEY: z.string().optional(), // Fish Audio API key for TTS (fallback)
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
    if (cachedEnv) return cachedEnv;

    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        console.error('❌ Invalid environment variables:');
        console.error(parsed.error.flatten().fieldErrors);
        throw new Error('Invalid environment configuration');
    }

    cachedEnv = parsed.data;
    return cachedEnv;
}

export function isDev(): boolean {
    return getEnv().NODE_ENV === 'development';
}
