/**
 * Supervisor Agent
 *
 * Manages platform agents with validation, retry, and quality assurance.
 * Ensures generated content follows platform rules and meets quality standards.
 *
 * @module ai/supervisor/SupervisorAgent
 */

import type {
    Platform,
    PlatformScript,
    MultiPlatformOptions,
    TrendData,
} from '@icerik/shared';
import { getAgentForPlatform } from '../agents/index.js';
import {
    ScriptValidator,
    getValidationRules,
    type ValidationResult,
} from '../validation/index.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('supervisor');

/**
 * Supervised generation options
 */
export interface SupervisedOptions extends Partial<MultiPlatformOptions> {
    /** Maximum retry attempts for failed validations */
    maxRetries?: number;
    /** Enable validation (default: true) */
    enableValidation?: boolean;
}

/**
 * Supervised script result with validation info
 */
export interface SupervisedScriptResult {
    platform: Platform;
    success: boolean;
    script?: PlatformScript;
    validation?: ValidationResult;
    attempts: number;
    error?: string;
}

/**
 * Supervised multi-platform result
 */
export interface SupervisedResult {
    trend: TrendData;
    results: SupervisedScriptResult[];
    totalAttempts: number;
    allValid: boolean;
}

/**
 * Default supervised options
 */
const DEFAULT_SUPERVISED_OPTIONS: Required<Pick<SupervisedOptions, 'maxRetries' | 'enableValidation'>> = {
    maxRetries: 2,
    enableValidation: true,
};

/**
 * Supervisor Agent
 *
 * Orchestrates platform agents with validation and retry capabilities.
 * Ensures all generated content meets platform-specific quality standards.
 */
export class SupervisorAgent {
    private validator: ScriptValidator;

    constructor() {
        this.validator = new ScriptValidator();
    }

    /**
     * Generate supervised scripts for specified platforms
     */
    async generateSupervised(
        trend: TrendData,
        platforms: Platform[],
        options: SupervisedOptions = {}
    ): Promise<SupervisedResult> {
        const opts = {
            ...DEFAULT_SUPERVISED_OPTIONS,
            ...options,
        };

        logger.info({ platforms, maxRetries: opts.maxRetries }, 'Starting supervised generation');

        const results: SupervisedScriptResult[] = [];
        let totalAttempts = 0;

        // Generate for each platform with supervision
        const promises = platforms.map(platform =>
            this.generateForPlatformSupervised(trend, platform, opts)
        );

        const platformResults = await Promise.allSettled(promises);

        for (let i = 0; i < platformResults.length; i++) {
            const result = platformResults[i];
            if (result.status === 'fulfilled') {
                results.push(result.value);
                totalAttempts += result.value.attempts;
            } else {
                results.push({
                    platform: platforms[i],
                    success: false,
                    attempts: 1,
                    error: result.reason?.message || 'Unknown error',
                });
                totalAttempts += 1;
            }
        }

        const allValid = results.every(r => r.success && r.validation?.isValid);

        logger.info({
            totalAttempts,
            successCount: results.filter(r => r.success).length,
            allValid,
        }, 'Supervised generation complete');

        return {
            trend,
            results,
            totalAttempts,
            allValid,
        };
    }

    /**
     * Generate for a single platform with validation and retry
     */
    private async generateForPlatformSupervised(
        trend: TrendData,
        platform: Platform,
        options: Required<Pick<SupervisedOptions, 'maxRetries' | 'enableValidation'>> & SupervisedOptions
    ): Promise<SupervisedScriptResult> {
        const agent = getAgentForPlatform(platform);
        const durationSeconds = options.durationSeconds || 30;

        const validationRules = getValidationRules(platform, durationSeconds, {
            requireHook: options.includeHook ?? true,
            requireCta: options.includeCta ?? true,
        });

        let lastScript: PlatformScript | undefined;
        let lastValidation: ValidationResult | undefined;
        let additionalInstructions = '';

        for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
            logger.debug({ platform, attempt }, 'Generation attempt');

            try {
                // Build options with any retry feedback
                const attemptOptions: Partial<MultiPlatformOptions> = {
                    ...options,
                };

                // Generate script
                const script = await agent.generateScript(trend, attemptOptions);
                lastScript = script;

                // Skip validation if disabled
                if (!options.enableValidation) {
                    return {
                        platform,
                        success: true,
                        script,
                        attempts: attempt,
                    };
                }

                // Validate
                const validation = this.validator.validate(script, validationRules);
                lastValidation = validation;

                // If valid, return success
                if (validation.isValid) {
                    logger.debug({ platform, attempt, score: validation.score }, 'Validation passed');
                    return {
                        platform,
                        success: true,
                        script,
                        validation,
                        attempts: attempt,
                    };
                }

                // If not valid but last attempt, return with warnings
                if (attempt === options.maxRetries) {
                    logger.warn({ platform, violations: validation.violations.length }, 'Max retries reached');

                    // Add validation warnings to script
                    script.warnings = [
                        ...(script.warnings || []),
                        ...validation.violations.map(v => v.message),
                    ];

                    return {
                        platform,
                        success: true, // Still success, but with warnings
                        script,
                        validation,
                        attempts: attempt,
                    };
                }

                // Prepare feedback for next attempt
                additionalInstructions = validation.feedbackForRetry || '';
                logger.debug({ platform, feedback: additionalInstructions }, 'Preparing retry with feedback');

            } catch (error) {
                logger.error({ platform, attempt, error }, 'Generation attempt failed');

                if (attempt === options.maxRetries) {
                    return {
                        platform,
                        success: false,
                        script: lastScript,
                        validation: lastValidation,
                        attempts: attempt,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    };
                }
            }
        }

        // Should not reach here, but return failure just in case
        return {
            platform,
            success: false,
            script: lastScript,
            validation: lastValidation,
            attempts: options.maxRetries,
            error: 'Max retries exceeded',
        };
    }
}

/**
 * Singleton instance
 */
let supervisorInstance: SupervisorAgent | null = null;

/**
 * Get singleton supervisor agent
 */
export function getSupervisor(): SupervisorAgent {
    if (!supervisorInstance) {
        supervisorInstance = new SupervisorAgent();
    }
    return supervisorInstance;
}

/**
 * Reset supervisor instance (for testing)
 */
export function resetSupervisor(): void {
    supervisorInstance = null;
}
