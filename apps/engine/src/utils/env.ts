import { z } from 'zod';

const envSchema = z.object({
    REDDIT_USER_AGENT: z.string().default('TrendEngine/1.0 (Content Automation Tool)'),
    REDIS_URL: z.string().optional(),
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    POLL_INTERVAL_MS: z.coerce.number().default(300000),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    GEMINI_API_KEY: z.string().optional(),
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
