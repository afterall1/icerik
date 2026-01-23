/**
 * Gemini AI Client
 * 
 * Provides integration with Google's Gemini AI API for content generation.
 * Includes rate limiting, error handling, and retry logic.
 * 
 * @module ai/gemini
 */

import { createChildLogger } from '../utils/logger.js';
import { getEnv } from '../utils/env.js';

const logger = createChildLogger('gemini');

/**
 * Gemini API Configuration
 */
const GEMINI_CONFIG = {
    BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
    MODEL: 'gemini-3-flash-preview',
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
    TIMEOUT_MS: 30000,
    // No MAX_TOKENS limit - let AI use full model capacity for best content quality
    TEMPERATURE: 0.7,
} as const;

/**
 * Rate limiter state
 */
interface RateLimitState {
    requestsInLastMinute: number;
    lastRequestTime: number;
    backoffUntil: number;
}

const rateLimitState: RateLimitState = {
    requestsInLastMinute: 0,
    lastRequestTime: 0,
    backoffUntil: 0,
};

/**
 * Maximum requests per minute for Gemini API
 */
const MAX_REQUESTS_PER_MINUTE = 60;

/**
 * Gemini API Response structure
 */
interface GeminiResponse {
    candidates: Array<{
        content: {
            parts: Array<{
                text: string;
            }>;
            role: string;
        };
        finishReason: string;
        safetyRatings: Array<{
            category: string;
            probability: string;
        }>;
    }>;
    usageMetadata?: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
    };
}

/**
 * Gemini API Error
 */
export class GeminiError extends Error {
    constructor(
        message: string,
        public readonly statusCode?: number,
        public readonly retryable: boolean = false
    ) {
        super(message);
        this.name = 'GeminiError';
    }
}

/**
 * Checks if we're rate limited
 */
function isRateLimited(): boolean {
    const now = Date.now();

    // Check if in backoff period
    if (now < rateLimitState.backoffUntil) {
        return true;
    }

    // Reset counter if minute has passed
    if (now - rateLimitState.lastRequestTime > 60000) {
        rateLimitState.requestsInLastMinute = 0;
    }

    return rateLimitState.requestsInLastMinute >= MAX_REQUESTS_PER_MINUTE;
}

/**
 * Records a request for rate limiting
 */
function recordRequest(): void {
    const now = Date.now();

    if (now - rateLimitState.lastRequestTime > 60000) {
        rateLimitState.requestsInLastMinute = 0;
    }

    rateLimitState.requestsInLastMinute++;
    rateLimitState.lastRequestTime = now;
}

/**
 * Sets backoff period after rate limit hit
 */
function setBackoff(durationMs: number): void {
    rateLimitState.backoffUntil = Date.now() + durationMs;
    logger.warn({ durationMs }, 'Rate limit backoff set');
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gemini AI Client Class
 */
export class GeminiClient {
    private apiKey: string;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || getEnv().GEMINI_API_KEY || '';

        if (!this.apiKey) {
            logger.warn('Gemini API key not configured - AI features will be disabled');
        }
    }

    /**
     * Checks if the client is properly configured
     */
    isConfigured(): boolean {
        return !!this.apiKey;
    }

    /**
     * Generates content using Gemini AI
     * @param prompt - The prompt to send to Gemini
     * @param options - Optional configuration
     * @returns Generated text content
     */
    async generateContent(
        prompt: string,
        options: {
            temperature?: number;
            maxTokens?: number;
            systemInstruction?: string;
        } = {}
    ): Promise<string> {
        if (!this.isConfigured()) {
            throw new GeminiError('Gemini API key not configured', undefined, false);
        }

        if (isRateLimited()) {
            throw new GeminiError('Rate limit exceeded - please try again later', 429, true);
        }

        const url = `${GEMINI_CONFIG.BASE_URL}/models/${GEMINI_CONFIG.MODEL}:generateContent?key=${this.apiKey}`;

        const requestBody = {
            contents: [
                {
                    parts: [{ text: prompt }],
                },
            ],
            generationConfig: {
                temperature: options.temperature ?? GEMINI_CONFIG.TEMPERATURE,
                // No maxOutputTokens limit - allow full model capacity for complete viral content
                topP: 0.8,
                topK: 40,
            },
            ...(options.systemInstruction && {
                systemInstruction: {
                    parts: [{ text: options.systemInstruction }],
                },
            }),
        };

        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= GEMINI_CONFIG.MAX_RETRIES; attempt++) {
            try {
                recordRequest();

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), GEMINI_CONFIG.TIMEOUT_MS);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorBody = await response.text();

                    if (response.status === 429) {
                        setBackoff(60000); // 1 minute backoff
                        throw new GeminiError('Rate limit exceeded', 429, true);
                    }

                    if (response.status >= 500) {
                        throw new GeminiError(`Server error: ${response.status}`, response.status, true);
                    }

                    throw new GeminiError(
                        `API error: ${response.status} - ${errorBody}`,
                        response.status,
                        false
                    );
                }

                const data: GeminiResponse = await response.json();

                if (!data.candidates || data.candidates.length === 0) {
                    throw new GeminiError('No content generated - possibly blocked by safety filters', undefined, false);
                }

                const generatedText = data.candidates[0]?.content?.parts?.[0]?.text;

                if (!generatedText) {
                    throw new GeminiError('Empty response from Gemini', undefined, true);
                }

                // Check for truncation due to token limit
                const finishReason = data.candidates[0]?.finishReason;
                if (finishReason === 'MAX_TOKENS') {
                    logger.warn({
                        finishReason,
                        responseLength: generatedText.length,
                    }, 'Response was truncated due to token limit!');
                } else if (finishReason !== 'STOP') {
                    logger.warn({
                        finishReason,
                    }, 'Unexpected finish reason from Gemini');
                }

                logger.info({
                    attempt,
                    promptLength: prompt.length,
                    responseLength: generatedText.length,
                    finishReason,
                    tokens: data.usageMetadata,
                }, 'Content generated successfully');

                return generatedText;

            } catch (error) {
                lastError = error as Error;

                if (error instanceof GeminiError) {
                    if (!error.retryable) {
                        throw error;
                    }

                    if (attempt < GEMINI_CONFIG.MAX_RETRIES) {
                        const delay = GEMINI_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                        logger.warn({ attempt, delay, error: error.message }, 'Retrying after error');
                        await sleep(delay);
                        continue;
                    }
                }

                if (error instanceof Error && error.name === 'AbortError') {
                    throw new GeminiError('Request timed out', undefined, true);
                }

                logger.error({ error, attempt }, 'Gemini API call failed');
            }
        }

        throw lastError || new GeminiError('Unknown error after retries', undefined, false);
    }

    /**
     * Gets rate limit status
     */
    getRateLimitStatus(): {
        requestsInLastMinute: number;
        maxRequestsPerMinute: number;
        isLimited: boolean;
        backoffRemainingMs: number;
    } {
        const now = Date.now();
        return {
            requestsInLastMinute: rateLimitState.requestsInLastMinute,
            maxRequestsPerMinute: MAX_REQUESTS_PER_MINUTE,
            isLimited: isRateLimited(),
            backoffRemainingMs: Math.max(0, rateLimitState.backoffUntil - now),
        };
    }
}

/**
 * Singleton Gemini client instance
 */
let geminiInstance: GeminiClient | null = null;

/**
 * Gets the singleton Gemini client
 */
export function getGeminiClient(): GeminiClient {
    if (!geminiInstance) {
        geminiInstance = new GeminiClient();
    }
    return geminiInstance;
}

/**
 * Resets the Gemini client instance (for testing)
 */
export function resetGeminiClient(): void {
    geminiInstance = null;
}
