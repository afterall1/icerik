/**
 * Script Validator
 *
 * Validates generated scripts against platform-specific rules.
 * Part of the Supervisor Agent architecture.
 *
 * @module ai/validation/ScriptValidator
 */

import type {
    Platform,
    PlatformScript,
    PlatformAlgorithmFocus,
} from '@icerik/shared';
import { PLATFORM_ALGORITHM_FOCUS } from '@icerik/shared';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('validator');

/**
 * Validation rules for script content
 */
export interface ValidationRules {
    /** Target duration in seconds */
    targetDurationSeconds: number;
    /** Maximum allowed words (calculated from duration * 2.5) */
    maxWords: number;
    /** Minimum words for a valid script */
    minWords: number;
    /** Require hook section */
    requireHook: boolean;
    /** Require CTA section */
    requireCta: boolean;
    /** Minimum words for hook */
    minHookWords: number;
    /** Minimum words for body */
    minBodyWords: number;
    /** Platform-specific algorithm focus */
    algorithmFocus: PlatformAlgorithmFocus;
}

/**
 * Individual validation violation
 */
export interface Violation {
    /** Violation code */
    code: string;
    /** Human-readable message */
    message: string;
    /** Severity level */
    severity: 'error' | 'warning';
    /** Suggested fix */
    suggestion?: string;
}

/**
 * Complete validation result
 */
export interface ValidationResult {
    /** Overall validity - true if no errors */
    isValid: boolean;
    /** List of violations found */
    violations: Violation[];
    /** Overall quality score (0-100) */
    score: number;
    /** Feedback for AI retry */
    feedbackForRetry?: string;
}

/**
 * Get validation rules for a platform and duration
 */
export function getValidationRules(
    platform: Platform,
    targetDurationSeconds: number,
    options: { requireHook?: boolean; requireCta?: boolean } = {}
): ValidationRules {
    const algorithmFocus = PLATFORM_ALGORITHM_FOCUS[platform];
    const maxWords = Math.round(targetDurationSeconds * 2.5);

    return {
        targetDurationSeconds,
        maxWords,
        minWords: Math.max(10, Math.round(maxWords * 0.3)), // At least 30% of target
        requireHook: options.requireHook ?? true,
        requireCta: options.requireCta ?? true,
        minHookWords: 3,
        minBodyWords: 10,
        algorithmFocus,
    };
}

/**
 * Script Validator
 *
 * Validates scripts against platform-specific rules.
 * Returns detailed violations and suggestions.
 */
export class ScriptValidator {
    /**
     * Validate a script against rules
     */
    validate(script: PlatformScript, rules: ValidationRules): ValidationResult {
        const violations: Violation[] = [];
        let score = 100;

        // 1. Word count validation
        const totalWords =
            (script.sections.hook?.wordCount || 0) +
            script.sections.body.wordCount +
            (script.sections.cta?.wordCount || 0);

        if (totalWords > rules.maxWords) {
            const excess = totalWords - rules.maxWords;
            violations.push({
                code: 'WORD_COUNT_EXCEEDED',
                message: `Script ${totalWords} kelime, hedef ${rules.maxWords} kelime (${excess} fazla)`,
                severity: 'error',
                suggestion: `Body bölümünü ${excess} kelime kısalt`,
            });
            score -= 30;
        }

        if (totalWords < rules.minWords) {
            violations.push({
                code: 'WORD_COUNT_TOO_LOW',
                message: `Script çok kısa: ${totalWords} kelime (minimum ${rules.minWords})`,
                severity: 'warning',
                suggestion: 'Daha detaylı içerik ekle',
            });
            score -= 15;
        }

        // 2. Structure validation
        if (rules.requireHook && !script.sections.hook) {
            violations.push({
                code: 'MISSING_HOOK',
                message: 'Hook bölümü eksik',
                severity: 'error',
                suggestion: 'İlgi çekici bir hook ekle',
            });
            score -= 20;
        }

        if (rules.requireCta && !script.sections.cta) {
            violations.push({
                code: 'MISSING_CTA',
                message: 'CTA bölümü eksik',
                severity: 'warning',
                suggestion: 'Call-to-action ekle (paylaş, yorum yap, vb.)',
            });
            score -= 10;
        }

        // 3. Section completeness validation
        if (script.sections.hook && script.sections.hook.wordCount < rules.minHookWords) {
            violations.push({
                code: 'HOOK_TOO_SHORT',
                message: `Hook çok kısa: ${script.sections.hook.wordCount} kelime`,
                severity: 'warning',
                suggestion: 'Hook en az 3 kelime olmalı',
            });
            score -= 10;
        }

        if (script.sections.body.wordCount < rules.minBodyWords) {
            violations.push({
                code: 'BODY_TOO_SHORT',
                message: `Body çok kısa: ${script.sections.body.wordCount} kelime`,
                severity: 'error',
                suggestion: 'Ana içeriği genişlet',
            });
            score -= 25;
        }

        // 4. Check for incomplete sentences (ends without punctuation)
        const bodyContent = script.sections.body.content;
        const endsWithPunctuation = /[.!?…]$/.test(bodyContent.trim());
        if (!endsWithPunctuation) {
            violations.push({
                code: 'INCOMPLETE_CONTENT',
                message: 'İçerik tamamlanmamış görünüyor (noktalama yok)',
                severity: 'warning',
                suggestion: 'Cümleyi tamamla',
            });
            score -= 10;
        }

        // 5. Duration compliance (within optimal range)
        const optimal = rules.algorithmFocus.optimalDuration;
        const estimatedDuration = Math.round(totalWords / 2.5);

        if (estimatedDuration > optimal.max) {
            violations.push({
                code: 'DURATION_OVER_OPTIMAL',
                message: `Süre (${estimatedDuration}s) platform optimumunu aşıyor (max ${optimal.max}s)`,
                severity: 'warning',
                suggestion: `${optimal.ideal}s civarına indir`,
            });
            score -= 5;
        }

        // Build feedback for retry
        const feedbackForRetry = this.buildFeedbackPrompt(violations);

        // Ensure score is within bounds
        score = Math.max(0, Math.min(100, score));

        // isValid = no errors (warnings are OK)
        const hasErrors = violations.some(v => v.severity === 'error');

        logger.debug({ platform: script.platform, score, violations: violations.length }, 'Script validated');

        return {
            isValid: !hasErrors,
            violations,
            score,
            feedbackForRetry: hasErrors ? feedbackForRetry : undefined,
        };
    }

    /**
     * Build feedback prompt for AI retry
     */
    private buildFeedbackPrompt(violations: Violation[]): string {
        if (violations.length === 0) return '';

        const errorViolations = violations.filter(v => v.severity === 'error');
        if (errorViolations.length === 0) return '';

        const feedback = errorViolations
            .map(v => `- ${v.message}. ${v.suggestion || ''}`)
            .join('\n');

        return `
⚠️ ÖNCEKİ SCRIPT HATALI. DÜZELTİLMESİ GEREKEN SORUNLAR:
${feedback}

Bu sorunları düzelterek yeniden yaz.
`;
    }
}

/**
 * Singleton instance
 */
let validatorInstance: ScriptValidator | null = null;

/**
 * Get singleton validator
 */
export function getValidator(): ScriptValidator {
    if (!validatorInstance) {
        validatorInstance = new ScriptValidator();
    }
    return validatorInstance;
}
