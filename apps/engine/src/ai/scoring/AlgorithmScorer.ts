/**
 * Algorithm Scorer
 *
 * Scores generated scripts for viral potential based on
 * platform algorithm best practices.
 *
 * @module ai/scoring/AlgorithmScorer
 */

import type {
    Platform,
    PlatformScript,
    AlgorithmScore,
    PlatformAlgorithmFocus,
} from '@icerik/shared';
import { PLATFORM_ALGORITHM_FOCUS } from '@icerik/shared';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('algorithmScorer');

/**
 * Hook strength indicators - patterns that indicate strong hooks
 */
const STRONG_HOOK_PATTERNS = [
    /^(pov|stop|wait|you won't believe|unpopular opinion|breaking|just happened)/i,
    /\?$/,  // Ends with question
    /^[0-9]+\s/,  // Starts with number
    /^\[.*\]/,  // Starts with bracket (visual cue)
    /^(bu|şu|bunu|dikkat|dur|bekle)/i, // Turkish strong openers
];

const WEAK_HOOK_PATTERNS = [
    /^(hey|hi|hello|so|today|in this)/i,
    /^(merhaba|selam|arkadaşlar|herkese)/i,
    /^(bu video|bu içerik|bugün size)/i,
];

/**
 * Engagement trigger indicators
 */
const ENGAGEMENT_TRIGGERS = {
    questionMarks: /\?/g,
    commandVerbs: /\b(yorum(la)?|paylaş|kaydet|takip et|comment|share|save|follow)\b/gi,
    challengePhrases: /\b(you|sen|siz)\b.*\b(would|wouldn't|could|can|yapabilir|yapardın)\b/gi,
    debateTriggers: /\b(agree|disagree|wrong|right|katılır|katılmaz|yanlış|doğru)\b/gi,
};

/**
 * Loop potential indicators
 */
const LOOP_INDICATORS = {
    openEnding: /\.{3}$|…$/,
    callbackPhrases: /\b(watch again|tekrar izle|did you notice|fark ettin mi)\b/gi,
    mysteryEnding: /\?$/,
};

/**
 * Scoring result for individual metrics
 */
interface MetricResult {
    score: number;
    breakdown: AlgorithmScore['breakdown'][0];
    improvement?: string;
}

/**
 * Algorithm Scorer
 * 
 * Analyzes generated scripts across 5 dimensions to predict viral potential:
 * - Hook Strength: Attention-grabbing power
 * - Completion Potential: Will viewers watch to end
 * - Engagement Triggers: Comment/share bait effectiveness
 * - Platform Optimization: Algorithm compliance
 * - Loop Potential: Rewatchability
 */
export class AlgorithmScorer {
    /**
     * Score a script for viral potential
     */
    score(script: PlatformScript): AlgorithmScore {
        const algorithmFocus = PLATFORM_ALGORITHM_FOCUS[script.platform];
        const breakdown: AlgorithmScore['breakdown'] = [];
        const improvements: string[] = [];

        // 1. Hook Strength (0-100)
        const hookResult = this.scoreHookStrength(script, algorithmFocus);
        breakdown.push(hookResult.breakdown);
        if (hookResult.improvement) improvements.push(hookResult.improvement);

        // 2. Completion Potential (0-100)
        const completionResult = this.scoreCompletionPotential(script, algorithmFocus);
        breakdown.push(completionResult.breakdown);
        if (completionResult.improvement) improvements.push(completionResult.improvement);

        // 3. Engagement Triggers (0-100)
        const engagementResult = this.scoreEngagementTriggers(script);
        breakdown.push(engagementResult.breakdown);
        if (engagementResult.improvement) improvements.push(engagementResult.improvement);

        // 4. Platform Optimization (0-100)
        const platformResult = this.scorePlatformOptimization(script, algorithmFocus);
        breakdown.push(platformResult.breakdown);
        if (platformResult.improvement) improvements.push(platformResult.improvement);

        // 5. Loop Potential (0-100)
        const loopResult = this.scoreLoopPotential(script);
        breakdown.push(loopResult.breakdown);
        if (loopResult.improvement) improvements.push(loopResult.improvement);

        // Calculate weighted overall score
        const weights = {
            hookStrength: 0.25,
            completionPotential: 0.25,
            engagementTriggers: 0.20,
            platformOptimization: 0.15,
            loopPotential: 0.15,
        };

        const overallScore = Math.round(
            hookResult.score * weights.hookStrength +
            completionResult.score * weights.completionPotential +
            engagementResult.score * weights.engagementTriggers +
            platformResult.score * weights.platformOptimization +
            loopResult.score * weights.loopPotential
        );

        logger.debug({
            platform: script.platform,
            overallScore,
            hookStrength: hookResult.score,
            completionPotential: completionResult.score,
            engagementTriggers: engagementResult.score,
        }, 'Script scored');

        return {
            hookStrength: hookResult.score,
            completionPotential: completionResult.score,
            engagementTriggers: engagementResult.score,
            platformOptimization: platformResult.score,
            loopPotential: loopResult.score,
            overallScore,
            breakdown,
            improvements,
        };
    }

    /**
     * Score hook strength
     */
    private scoreHookStrength(
        script: PlatformScript,
        _algorithmFocus: PlatformAlgorithmFocus
    ): MetricResult {
        let score = 50; // Base score
        const hook = script.sections.hook?.content || '';
        const hookWords = hook.split(/\s+/).filter(Boolean).length;

        // Check for strong patterns
        for (const pattern of STRONG_HOOK_PATTERNS) {
            if (pattern.test(hook)) {
                score += 15;
                break;
            }
        }

        // Penalize weak patterns
        for (const pattern of WEAK_HOOK_PATTERNS) {
            if (pattern.test(hook)) {
                score -= 20;
                break;
            }
        }

        // Hook length optimization
        if (hookWords >= 5 && hookWords <= 15) {
            score += 10; // Optimal length
        } else if (hookWords > 20) {
            score -= 15; // Too long
        } else if (hookWords < 3) {
            score -= 10; // Too short
        }

        // Visual cue bonus
        if (/\[.*\]/.test(hook)) {
            score += 5;
        }

        // Cap score
        score = Math.max(0, Math.min(100, score));

        let improvement: string | undefined;
        if (score < 60) {
            improvement = 'Hook güçlendir: Pattern interrupt veya curiosity gap ekle (örn: "POV:", "Bekle...")';
        }

        return {
            score,
            breakdown: {
                metric: 'Hook Strength',
                score,
                feedback: score >= 70
                    ? 'Güçlü dikkat çekici hook'
                    : score >= 50
                        ? 'Orta seviye hook, geliştirilebilir'
                        : 'Zayıf hook, scroll-stop potansiyeli düşük',
            },
            improvement,
        };
    }

    /**
     * Score completion potential
     */
    private scoreCompletionPotential(
        script: PlatformScript,
        algorithmFocus: PlatformAlgorithmFocus
    ): MetricResult {
        let score = 50;
        const totalWords =
            (script.sections.hook?.wordCount || 0) +
            script.sections.body.wordCount +
            (script.sections.cta?.wordCount || 0);

        const estimatedDuration = Math.round(totalWords / 2.5);
        const optimal = algorithmFocus.optimalDuration;

        // Duration scoring
        if (estimatedDuration >= optimal.min && estimatedDuration <= optimal.max) {
            score += 25;
            if (Math.abs(estimatedDuration - optimal.ideal) <= 5) {
                score += 15; // Very close to ideal
            }
        } else if (estimatedDuration > optimal.max) {
            const overBy = estimatedDuration - optimal.max;
            score -= Math.min(30, overBy * 2); // Penalty increases with excess
        } else if (estimatedDuration < optimal.min) {
            score -= 10; // Slightly too short
        }

        // Check for pattern interrupts (visual cues in script)
        const patternInterrupts = (script.script.match(/\[.*?\]/g) || []).length;
        if (patternInterrupts >= 3) {
            score += 10;
        } else if (patternInterrupts >= 1) {
            score += 5;
        }

        score = Math.max(0, Math.min(100, score));

        let improvement: string | undefined;
        if (estimatedDuration > optimal.max) {
            improvement = `Süreyi ${optimal.ideal}s civarına indir (şu an ~${estimatedDuration}s)`;
        } else if (patternInterrupts < 2) {
            improvement = 'Daha fazla pattern interrupt ekle ([ZOOM], [TEXT], vb.)';
        }

        return {
            score,
            breakdown: {
                metric: 'Completion Potential',
                score,
                feedback: `~${estimatedDuration}s (optimal: ${optimal.ideal}s, aralık: ${optimal.min}-${optimal.max}s)`,
            },
            improvement,
        };
    }

    /**
     * Score engagement triggers
     */
    private scoreEngagementTriggers(script: PlatformScript): MetricResult {
        let score = 30; // Base score
        const fullScript = script.script;
        const cta = script.sections.cta?.content || '';

        // Question marks (encourage comments)
        const questions = (fullScript.match(ENGAGEMENT_TRIGGERS.questionMarks) || []).length;
        if (questions >= 1) score += 15;
        if (questions >= 2) score += 10;

        // Command verbs in CTA
        const commands = (cta.match(ENGAGEMENT_TRIGGERS.commandVerbs) || []).length;
        if (commands >= 1) score += 20;

        // Debate triggers
        const debates = (fullScript.match(ENGAGEMENT_TRIGGERS.debateTriggers) || []).length;
        if (debates >= 1) score += 15;

        // Challenge phrases
        const challenges = (fullScript.match(ENGAGEMENT_TRIGGERS.challengePhrases) || []).length;
        if (challenges >= 1) score += 10;

        score = Math.max(0, Math.min(100, score));

        let improvement: string | undefined;
        if (!cta || cta.trim().length === 0) {
            improvement = 'CTA ekle: Yorum/paylaşım tetikleyici (örn: "Yorumlara yaz", "Paylaş")';
        } else if (questions < 1) {
            improvement = 'Soru ekle: İzleyici etkileşimini artırır';
        }

        return {
            score,
            breakdown: {
                metric: 'Engagement Triggers',
                score,
                feedback: score >= 70
                    ? 'Güçlü engagement tetikleyicileri'
                    : score >= 50
                        ? 'Yeterli engagement potential'
                        : 'Daha fazla yorum/paylaşım tetikleyici eklenebilir',
            },
            improvement,
        };
    }

    /**
     * Score platform-specific optimization
     */
    private scorePlatformOptimization(
        script: PlatformScript,
        algorithmFocus: PlatformAlgorithmFocus
    ): MetricResult {
        let score = 50;

        // Hashtag count optimization
        const hashtagCount = script.hashtags.length;
        const optimalMin = algorithmFocus.hashtagStrategy.count.min;
        const optimalMax = algorithmFocus.hashtagStrategy.count.max;

        if (hashtagCount >= optimalMin && hashtagCount <= optimalMax) {
            score += 20;
        } else if (hashtagCount > 0) {
            score += 10;
        } else {
            score -= 15;
        }

        // Check for platform-appropriate content
        if (script.optimizations && script.optimizations.length > 0) {
            score += 15;
        }

        // Check sections alignment
        if (script.sections.hook) score += 5;
        if (script.sections.cta) score += 10;

        score = Math.max(0, Math.min(100, score));

        let improvement: string | undefined;
        if (hashtagCount < optimalMin) {
            improvement = `Hashtag sayısını artır (minimum ${optimalMin}, şu an ${hashtagCount})`;
        } else if (hashtagCount > optimalMax) {
            improvement = `Hashtag sayısını azalt (maximum ${optimalMax}, şu an ${hashtagCount})`;
        }

        return {
            score,
            breakdown: {
                metric: 'Platform Optimization',
                score,
                feedback: `${script.platform.toUpperCase()} algoritma uyumu (${hashtagCount} hashtag)`,
            },
            improvement,
        };
    }

    /**
     * Score loop potential
     */
    private scoreLoopPotential(script: PlatformScript): MetricResult {
        let score = 40; // Base score
        const fullScript = script.script;
        const cta = script.sections.cta?.content || '';
        const hook = script.sections.hook?.content || '';

        // Check for loop-friendly ending
        if (LOOP_INDICATORS.openEnding.test(fullScript)) {
            score += 15;
        }

        // Check for callback phrases
        if (LOOP_INDICATORS.callbackPhrases.test(fullScript)) {
            score += 25;
        }

        // Mystery ending (question at end)
        if (LOOP_INDICATORS.mysteryEnding.test(cta) || LOOP_INDICATORS.mysteryEnding.test(fullScript.slice(-50))) {
            score += 15;
        }

        // Connection between end and beginning (basic check)
        const hookFirstWord = hook.split(/\s+/)[0]?.toLowerCase() || '';
        const lastSentence = fullScript.split(/[.!?]/).slice(-2)[0]?.toLowerCase() || '';
        if (lastSentence.includes(hookFirstWord) && hookFirstWord.length > 3) {
            score += 10;
        }

        score = Math.max(0, Math.min(100, score));

        let improvement: string | undefined;
        if (score < 60) {
            improvement = 'Loop-friendly ending ekle: Sona soru veya gizem bırak, izleyiciyi başa döndür';
        }

        return {
            score,
            breakdown: {
                metric: 'Loop Potential',
                score,
                feedback: score >= 60
                    ? 'Tekrar izleme potansiyeli var'
                    : 'Daha güçlü loop trigger gerekli',
            },
            improvement,
        };
    }

    /**
     * Get viral potential label based on score
     */
    getViralLabel(score: number): {
        label: string;
        emoji: string;
        color: 'green' | 'blue' | 'yellow' | 'orange' | 'red';
    } {
        if (score >= 80) return { label: 'Viral Potansiyel Çok Yüksek', emoji: '🔥', color: 'green' };
        if (score >= 65) return { label: 'Viral Potansiyel Yüksek', emoji: '📈', color: 'blue' };
        if (score >= 50) return { label: 'Orta Potansiyel', emoji: '⚡', color: 'yellow' };
        if (score >= 35) return { label: 'Düşük Potansiyel', emoji: '📉', color: 'orange' };
        return { label: 'İyileştirme Gerekli', emoji: '⚠️', color: 'red' };
    }

    /**
     * Get score category for analytics
     */
    getScoreCategory(score: number): 'excellent' | 'good' | 'average' | 'poor' | 'critical' {
        if (score >= 80) return 'excellent';
        if (score >= 65) return 'good';
        if (score >= 50) return 'average';
        if (score >= 35) return 'poor';
        return 'critical';
    }
}

/**
 * Singleton instance
 */
let scorerInstance: AlgorithmScorer | null = null;

/**
 * Get singleton scorer
 */
export function getAlgorithmScorer(): AlgorithmScorer {
    if (!scorerInstance) {
        scorerInstance = new AlgorithmScorer();
    }
    return scorerInstance;
}

/**
 * Reset scorer instance (for testing)
 */
export function resetAlgorithmScorer(): void {
    scorerInstance = null;
}
