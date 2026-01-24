/**
 * Image Validator using Gemini Vision
 * 
 * Validates images for text/overlay content using Gemini's vision capabilities.
 * Used to filter out images with embedded text that would interfere with video overlays.
 * 
 * @module images/ImageValidator
 */

import { createChildLogger } from '../utils/logger.js';
import { getEnv } from '../utils/env.js';

const logger = createChildLogger('image-validator');

/**
 * Gemini Vision Configuration
 */
const VISION_CONFIG = {
    BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
    MODEL: 'gemini-2.0-flash',
    TIMEOUT_MS: 15000,
    MAX_RETRIES: 2,
} as const;

/**
 * Validation result for an image
 */
export interface ImageValidationResult {
    imageUrl: string;
    isClean: boolean;           // No text detected
    hasText: boolean;           // Text detected in image
    hasOverlay: boolean;        // Overlay/watermark detected
    confidenceScore: number;    // 0-1 confidence in the analysis
    detectedElements: string[]; // What was detected
    rawAnalysis?: string;       // Raw AI analysis for debugging
}

/**
 * Vision API request with image URL
 */
interface VisionRequest {
    contents: Array<{
        parts: Array<{
            text?: string;
            inline_data?: {
                mime_type: string;
                data: string;
            };
            file_data?: {
                file_uri: string;
                mime_type: string;
            };
        }>;
    }>;
    generationConfig: {
        temperature: number;
        maxOutputTokens: number;
    };
}

/**
 * Gemini API Response
 */
interface GeminiVisionResponse {
    candidates: Array<{
        content: {
            parts: Array<{
                text: string;
            }>;
        };
        finishReason: string;
    }>;
}

/**
 * Image Validator Error
 */
export class ImageValidatorError extends Error {
    constructor(
        message: string,
        public readonly retryable: boolean = false
    ) {
        super(message);
        this.name = 'ImageValidatorError';
    }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Image Validator Class
 */
export class ImageValidator {
    private apiKey: string;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || getEnv().GEMINI_API_KEY || '';

        if (!this.apiKey) {
            logger.warn('Gemini API key not configured - image validation will be disabled');
        }
    }

    /**
     * Checks if the validator is properly configured
     */
    isConfigured(): boolean {
        return !!this.apiKey;
    }

    /**
     * Validate a single image for text/overlay content
     */
    async validateImage(imageUrl: string): Promise<ImageValidationResult> {
        if (!this.isConfigured()) {
            // Return "clean" if not configured to allow fallback behavior
            logger.warn('Image validator not configured, assuming image is clean');
            return {
                imageUrl,
                isClean: true,
                hasText: false,
                hasOverlay: false,
                confidenceScore: 0,
                detectedElements: [],
            };
        }

        const url = `${VISION_CONFIG.BASE_URL}/models/${VISION_CONFIG.MODEL}:generateContent?key=${this.apiKey}`;

        const prompt = `Analyze this image and determine if it contains any text, watermarks, or overlays.

Your task is to detect:
1. **Visible Text**: Any readable text, titles, captions, or labels embedded in the image
2. **Watermarks**: Logo watermarks, photographer credits, stock photo marks
3. **Overlays**: Graphical overlays, banners, badges, or borders with text

Respond in this exact JSON format:
{
  "hasText": true/false,
  "hasOverlay": true/false,
  "detectedElements": ["list", "of", "detected", "items"],
  "confidence": 0.0-1.0
}

If the image is clean (no text, watermarks, or overlays), respond with:
{
  "hasText": false,
  "hasOverlay": false,
  "detectedElements": [],
  "confidence": 0.95
}

ONLY respond with valid JSON, no other text.`;

        const requestBody: VisionRequest = {
            contents: [
                {
                    parts: [
                        { text: prompt },
                        {
                            file_data: {
                                file_uri: imageUrl,
                                mime_type: this.getMimeType(imageUrl),
                            },
                        },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.1, // Low temperature for consistent analysis
                maxOutputTokens: 256,
            },
        };

        for (let attempt = 1; attempt <= VISION_CONFIG.MAX_RETRIES; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), VISION_CONFIG.TIMEOUT_MS);

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

                    // If file_data approach fails, try with image download
                    if (response.status === 400 && attempt === 1) {
                        logger.warn('file_data approach failed, trying inline_data');
                        return await this.validateImageWithDownload(imageUrl);
                    }

                    throw new ImageValidatorError(
                        `Vision API error: ${response.status} - ${errorBody}`,
                        response.status >= 500
                    );
                }

                const data: GeminiVisionResponse = await response.json();

                if (!data.candidates || data.candidates.length === 0) {
                    throw new ImageValidatorError('No analysis generated', true);
                }

                const analysisText = data.candidates[0]?.content?.parts?.[0]?.text || '';

                return this.parseAnalysis(imageUrl, analysisText);

            } catch (error) {
                if (error instanceof ImageValidatorError && !error.retryable) {
                    throw error;
                }

                if (attempt < VISION_CONFIG.MAX_RETRIES) {
                    await sleep(500 * attempt);
                    continue;
                }

                logger.error({ error, imageUrl }, 'Image validation failed');

                // Return as "clean" on error to not block the flow
                return {
                    imageUrl,
                    isClean: true,
                    hasText: false,
                    hasOverlay: false,
                    confidenceScore: 0,
                    detectedElements: [],
                    rawAnalysis: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        }

        // Should not reach here, but return clean as fallback
        return {
            imageUrl,
            isClean: true,
            hasText: false,
            hasOverlay: false,
            confidenceScore: 0,
            detectedElements: [],
        };
    }

    /**
     * Validate image by downloading and sending as base64
     */
    private async validateImageWithDownload(imageUrl: string): Promise<ImageValidationResult> {
        try {
            // Download image
            const imageResponse = await fetch(imageUrl, {
                headers: { 'Accept': 'image/*' },
            });

            if (!imageResponse.ok) {
                throw new ImageValidatorError(`Failed to download image: ${imageResponse.status}`, false);
            }

            const imageBuffer = await imageResponse.arrayBuffer();
            const base64Image = Buffer.from(imageBuffer).toString('base64');
            const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

            const url = `${VISION_CONFIG.BASE_URL}/models/${VISION_CONFIG.MODEL}:generateContent?key=${this.apiKey}`;

            const prompt = `Analyze this image for text, watermarks, or overlays.

Respond ONLY in this exact JSON format:
{
  "hasText": true/false,
  "hasOverlay": true/false,
  "detectedElements": [],
  "confidence": 0.95
}`;

            const requestBody = {
                contents: [
                    {
                        parts: [
                            { text: prompt },
                            {
                                inline_data: {
                                    mime_type: mimeType,
                                    data: base64Image,
                                },
                            },
                        ],
                    },
                ],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 256,
                },
            };

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), VISION_CONFIG.TIMEOUT_MS);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new ImageValidatorError(`Vision API error: ${response.status}`, false);
            }

            const data: GeminiVisionResponse = await response.json();
            const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            return this.parseAnalysis(imageUrl, analysisText);

        } catch (error) {
            logger.error({ error, imageUrl }, 'Image validation with download failed');
            return {
                imageUrl,
                isClean: true,
                hasText: false,
                hasOverlay: false,
                confidenceScore: 0,
                detectedElements: [],
                rawAnalysis: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Parse AI analysis response
     */
    private parseAnalysis(imageUrl: string, analysisText: string): ImageValidationResult {
        try {
            // Extract JSON from response (handle markdown code blocks)
            let jsonStr = analysisText.trim();

            // Remove markdown code blocks if present
            if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
            }

            const parsed = JSON.parse(jsonStr);

            const hasText = Boolean(parsed.hasText);
            const hasOverlay = Boolean(parsed.hasOverlay);
            const isClean = !hasText && !hasOverlay;

            return {
                imageUrl,
                isClean,
                hasText,
                hasOverlay,
                confidenceScore: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
                detectedElements: Array.isArray(parsed.detectedElements) ? parsed.detectedElements : [],
                rawAnalysis: analysisText,
            };

        } catch (parseError) {
            logger.warn({ analysisText, parseError }, 'Failed to parse AI analysis, using heuristics');

            // Fallback heuristics
            const lowerText = analysisText.toLowerCase();
            const hasText = lowerText.includes('text') && !lowerText.includes('no text');
            const hasOverlay = lowerText.includes('watermark') || lowerText.includes('overlay') || lowerText.includes('logo');

            return {
                imageUrl,
                isClean: !hasText && !hasOverlay,
                hasText,
                hasOverlay,
                confidenceScore: 0.3, // Low confidence for heuristic analysis
                detectedElements: [],
                rawAnalysis: analysisText,
            };
        }
    }

    /**
     * Batch validate multiple images
     */
    async validateImages(imageUrls: string[]): Promise<ImageValidationResult[]> {
        const results: ImageValidationResult[] = [];

        // Process in parallel with concurrency limit
        const CONCURRENCY = 3;
        for (let i = 0; i < imageUrls.length; i += CONCURRENCY) {
            const batch = imageUrls.slice(i, i + CONCURRENCY);
            const batchResults = await Promise.all(
                batch.map(url => this.validateImage(url))
            );
            results.push(...batchResults);
        }

        logger.info({
            total: imageUrls.length,
            clean: results.filter(r => r.isClean).length,
            withText: results.filter(r => r.hasText).length,
            withOverlay: results.filter(r => r.hasOverlay).length,
        }, 'Batch validation completed');

        return results;
    }

    /**
     * Get MIME type from URL
     */
    private getMimeType(url: string): string {
        const ext = url.split('.').pop()?.toLowerCase().split('?')[0] || '';

        const mimeTypes: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
        };

        return mimeTypes[ext] || 'image/jpeg';
    }
}

/**
 * Singleton Image Validator instance
 */
let validatorInstance: ImageValidator | null = null;

/**
 * Gets the singleton Image Validator
 */
export function getImageValidator(): ImageValidator {
    if (!validatorInstance) {
        validatorInstance = new ImageValidator();
    }
    return validatorInstance;
}

/**
 * Resets the Image Validator instance (for testing)
 */
export function resetImageValidator(): void {
    validatorInstance = null;
}
