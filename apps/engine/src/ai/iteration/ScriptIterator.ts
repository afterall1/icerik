/**
 * Script Iterator Module
 *
 * Enables partial regeneration of script sections without regenerating
 * the entire script. Supports iterating on hooks, CTAs, tone, length, etc.
 *
 * @module ai/iteration/ScriptIterator
 */

import type { Platform, PlatformScript } from '@icerik/shared';
import { PLATFORM_ALGORITHM_FOCUS, PLATFORM_LABELS } from '@icerik/shared';
import { getGeminiClient, GeminiError } from '../gemini.js';
import { createChildLogger } from '../../utils/logger.js';
import { getAIMetrics } from '../metrics/index.js';

const logger = createChildLogger('scriptIterator');

/**
 * Iteration target - which part to regenerate (local definition)
 */
export type IterationTarget =
    | 'hook'        // Just the hook
    | 'body'        // Just the body
    | 'cta'         // Just the CTA
    | 'title'       // Just the title
    | 'hashtags'    // Just hashtags
    | 'shorten'     // Make 20% shorter
    | 'lengthen'    // Make 20% longer
    | 'change_tone' // Change tone
    | 'add_hooks';  // Add more re-hooks

/**
 * Iteration request (local definition)
 */
export interface IterationRequestWithScript {
    originalScript: PlatformScript;
    target: IterationTarget;
    newTone?: 'casual' | 'professional' | 'humorous' | 'dramatic';
    additionalInstructions?: string;
}

/**
 * Iteration result (local definition)
 */
export interface IterationResultWithScript {
    updatedScript: PlatformScript;
    changedSections: string[];
    metadata: {
        iterationType: IterationTarget;
        tokensUsed: number;
        durationMs: number;
    };
}

/**
 * Iteration prompts for each target type
 */
const ITERATION_PROMPTS: Record<IterationTarget, (script: PlatformScript) => string> = {
    hook: (script) => `
You have the following script for ${PLATFORM_LABELS[script.platform]}:

[CURRENT SCRIPT]
${script.script}

TASK: Generate a NEW, MORE ENGAGING hook that:
- Grabs attention in the first 1-2 seconds
- Creates curiosity gap or pattern interrupt
- Is appropriate for ${PLATFORM_LABELS[script.platform]} algorithm
- Is under 10 words

Output ONLY the new hook text, nothing else.
`,

    body: (script) => `
You have the following script sections for ${PLATFORM_LABELS[script.platform]}:

[HOOK]
${script.sections.hook?.content ?? 'N/A'}

[BODY]
${script.sections.body.content}

[CTA]
${script.sections.cta?.content ?? 'N/A'}

TASK: Rewrite the BODY section to be more engaging while:
- Keeping the same core information
- Improving flow and pacing
- Adding pattern interrupts every 3-5 seconds
- Staying within similar word count (${script.sections.body.wordCount} words)

Output ONLY the new body text, nothing else.
`,

    cta: (script) => `
You have the following script for ${PLATFORM_LABELS[script.platform]}:

[CURRENT SCRIPT]
${script.script}

TASK: Generate a NEW, MORE COMPELLING call-to-action that:
- Drives engagement (comments, shares, follows)
- Matches ${PLATFORM_LABELS[script.platform]} best practices
- Is under 15 words
- Creates urgency or curiosity

Output ONLY the new CTA text, nothing else.
`,

    title: (script) => `
You have the following script for ${PLATFORM_LABELS[script.platform]}:

[CURRENT TITLE]
${script.title}

[SCRIPT SUMMARY]
${script.sections.hook?.content ?? ''} ${script.sections.body.content.slice(0, 200)}...

TASK: Generate a NEW, MORE CLICKABLE title that:
- Creates curiosity without being clickbait
- Is under 60 characters
- Works well with ${PLATFORM_LABELS[script.platform]} algorithm
- Uses emoji sparingly but effectively

Output ONLY the new title, nothing else.
`,

    hashtags: (script) => `
You have the following content for ${PLATFORM_LABELS[script.platform]}:

[CURRENT HASHTAGS]
${script.hashtags.join(' ')}

[SCRIPT SUMMARY]
${script.sections.hook?.content ?? ''} ${script.sections.body.content.slice(0, 200)}...

[CATEGORY]
${script.metadata.category}

TASK: Generate ${PLATFORM_ALGORITHM_FOCUS[script.platform].hashtagStrategy.count.min}-${PLATFORM_ALGORITHM_FOCUS[script.platform].hashtagStrategy.count.max} optimized hashtags that:
- Mix trending and niche hashtags
- Include category-relevant tags
- Follow ${PLATFORM_LABELS[script.platform]} hashtag strategy

Output ONLY the hashtags separated by spaces, nothing else.
`,

    shorten: (script) => `
You have the following script for ${PLATFORM_LABELS[script.platform]}:

[CURRENT SCRIPT]
${script.script}

[CURRENT WORD COUNT]
${script.sections.body.wordCount + (script.sections.hook?.wordCount ?? 0) + (script.sections.cta?.wordCount ?? 0)} words

TASK: Shorten this script by approximately 20% while:
- Keeping all essential information
- Maintaining the hook's impact
- Preserving the CTA
- Removing filler words and redundancy

Output the shortened script with [HOOK], [BODY], [CTA] sections.
`,

    lengthen: (script) => `
You have the following script for ${PLATFORM_LABELS[script.platform]}:

[CURRENT SCRIPT]
${script.script}

[CURRENT WORD COUNT]
${script.sections.body.wordCount + (script.sections.hook?.wordCount ?? 0) + (script.sections.cta?.wordCount ?? 0)} words

TASK: Extend this script by approximately 20% while:
- Adding more detail or examples
- Including additional engagement points
- Keeping the same structure
- Not padding with filler

Output the extended script with [HOOK], [BODY], [CTA] sections.
`,

    change_tone: (script) => `
You have the following script for ${PLATFORM_LABELS[script.platform]}:

[CURRENT SCRIPT]
${script.script}

TASK: This prompt will be completed with the new tone instruction.
`,

    add_hooks: (script) => `
You have the following script for ${PLATFORM_LABELS[script.platform]}:

[CURRENT SCRIPT]
${script.script}

[DURATION]
~${script.estimatedDurationSeconds} seconds

TASK: Add RE-HOOK moments to maintain attention throughout the video:
- Add pattern interrupts every 3-5 seconds
- Types: questions, reveals, twists, callbacks, visual cues
- Mark them with [RE-HOOK @Xs] where X is the second mark

Output the script with re-hooks marked, keeping original structure.
`,
};

/**
 * Tone descriptions for change_tone iterations
 */
const TONE_DESCRIPTIONS: Record<string, string> = {
    casual: 'Rewrite in a casual, friendly tone. Use contractions, conversational language, as if talking to a friend.',
    professional: 'Rewrite in a professional, authoritative tone. Polished language, maintain credibility.',
    humorous: 'Rewrite with humor and wit. Add jokes, playful language, but keep the core message.',
    dramatic: 'Rewrite with dramatic flair. Emphasis, pauses, emotional language for impact.',
};

/**
 * Script Iterator
 *
 * Handles partial regeneration of script sections.
 */
export class ScriptIterator {
    /**
     * Iterate on a script section
     */
    async iterate(request: IterationRequestWithScript): Promise<IterationResultWithScript> {
        const { originalScript, target, newTone, additionalInstructions } = request;
        const metrics = getAIMetrics();
        const operationId = metrics.startOperation('iterate', {
            platform: originalScript.platform,
            category: originalScript.metadata.category,
        });

        const startTime = Date.now();

        logger.info({
            platform: originalScript.platform,
            target,
            trendId: originalScript.metadata.trendId,
        }, 'Starting script iteration');

        try {
            const gemini = getGeminiClient();

            if (!gemini.isConfigured()) {
                throw new GeminiError('Gemini API is not configured', undefined, false);
            }

            // Build the iteration prompt
            let prompt = ITERATION_PROMPTS[target](originalScript);

            // Add tone-specific instructions if applicable
            if (target === 'change_tone' && newTone) {
                prompt = prompt.replace(
                    'This prompt will be completed with the new tone instruction.',
                    TONE_DESCRIPTIONS[newTone]
                );
            }

            // Add any additional user instructions
            if (additionalInstructions) {
                prompt += `\n\nADDITIONAL INSTRUCTIONS: ${additionalInstructions}`;
            }

            // Generate the iteration
            const response = await gemini.generateContent(prompt, {
                systemInstruction: `You are a ${PLATFORM_LABELS[originalScript.platform]} content expert. 
Follow instructions precisely. Output ONLY what is requested.`,
                temperature: 0.8,
                maxTokens: 1024,
            });

            // Build updated script based on target
            const updatedScript = this.applyIteration(originalScript, target, response);
            const changedSections = this.getChangedSections(target);

            const durationMs = Date.now() - startTime;

            metrics.endOperation(operationId, {
                success: true,
                promptTokens: Math.round(prompt.length / 4),
                responseTokens: Math.round(response.length / 4),
            });

            logger.info({
                platform: originalScript.platform,
                target,
                durationMs,
                changedSections,
            }, 'Script iteration completed');

            return {
                updatedScript,
                changedSections,
                metadata: {
                    iterationType: target,
                    tokensUsed: Math.round((prompt.length + response.length) / 4),
                    durationMs,
                },
            };
        } catch (error) {
            const durationMs = Date.now() - startTime;

            metrics.endOperation(operationId, {
                success: false,
                errorType: error instanceof Error ? error.name : 'unknown',
                errorMessage: error instanceof Error ? error.message : String(error),
            });

            logger.error({
                platform: originalScript.platform,
                target,
                error,
                durationMs,
            }, 'Script iteration failed');

            throw error;
        }
    }

    /**
     * Apply iteration result to script
     */
    private applyIteration(
        original: PlatformScript,
        target: IterationTarget,
        response: string
    ): PlatformScript {
        const updated: PlatformScript = JSON.parse(JSON.stringify(original));
        const trimmedResponse = response.trim();

        switch (target) {
            case 'hook':
                if (updated.sections.hook) {
                    updated.sections.hook.content = trimmedResponse;
                    updated.sections.hook.wordCount = trimmedResponse.split(/\s+/).length;
                }
                break;

            case 'body':
                updated.sections.body.content = trimmedResponse;
                updated.sections.body.wordCount = trimmedResponse.split(/\s+/).length;
                break;

            case 'cta':
                if (updated.sections.cta) {
                    updated.sections.cta.content = trimmedResponse;
                    updated.sections.cta.wordCount = trimmedResponse.split(/\s+/).length;
                }
                break;

            case 'title':
                updated.title = trimmedResponse;
                break;

            case 'hashtags':
                updated.hashtags = trimmedResponse
                    .split(/\s+/)
                    .map(h => h.startsWith('#') ? h : `#${h}`)
                    .filter(h => h.length > 1);
                break;

            case 'shorten':
            case 'lengthen':
            case 'change_tone':
            case 'add_hooks':
                // Parse full script response
                this.parseFullScriptResponse(updated, trimmedResponse);
                break;
        }

        // Rebuild full script text
        this.rebuildScriptText(updated);

        return updated;
    }

    /**
     * Parse full script response into sections
     */
    private parseFullScriptResponse(script: PlatformScript, response: string): void {
        const hookMatch = response.match(/\[HOOK\]\s*([\s\S]*?)(?=\[BODY\]|\[CTA\]|$)/i);
        const bodyMatch = response.match(/\[BODY\]\s*([\s\S]*?)(?=\[CTA\]|$)/i);
        const ctaMatch = response.match(/\[CTA\]\s*([\s\S]*?)$/i);

        if (hookMatch?.[1] && script.sections.hook) {
            const content = hookMatch[1].trim();
            script.sections.hook.content = content;
            script.sections.hook.wordCount = content.split(/\s+/).length;
        }

        if (bodyMatch?.[1]) {
            const content = bodyMatch[1].trim();
            script.sections.body.content = content;
            script.sections.body.wordCount = content.split(/\s+/).length;
        }

        if (ctaMatch?.[1] && script.sections.cta) {
            const content = ctaMatch[1].trim();
            script.sections.cta.content = content;
            script.sections.cta.wordCount = content.split(/\s+/).length;
        }
    }

    /**
     * Rebuild full script text from sections
     */
    private rebuildScriptText(script: PlatformScript): void {
        const parts: string[] = [];

        if (script.sections.hook) {
            parts.push(`[HOOK]\n${script.sections.hook.content}`);
        }

        parts.push(`[BODY]\n${script.sections.body.content}`);

        if (script.sections.cta) {
            parts.push(`[CTA]\n${script.sections.cta.content}`);
        }

        script.script = parts.join('\n\n');

        // Recalculate duration
        const totalWords =
            (script.sections.hook?.wordCount ?? 0) +
            script.sections.body.wordCount +
            (script.sections.cta?.wordCount ?? 0);

        script.estimatedDurationSeconds = Math.round(totalWords / 2.5);
    }

    /**
     * Get list of changed sections for a target
     */
    private getChangedSections(target: IterationTarget): string[] {
        switch (target) {
            case 'hook':
                return ['hook'];
            case 'body':
                return ['body'];
            case 'cta':
                return ['cta'];
            case 'title':
                return ['title'];
            case 'hashtags':
                return ['hashtags'];
            case 'shorten':
            case 'lengthen':
            case 'change_tone':
            case 'add_hooks':
                return ['hook', 'body', 'cta'];
        }
    }
}

// ============================================================
// Singleton Instance
// ============================================================

let iteratorInstance: ScriptIterator | null = null;

/**
 * Get the singleton ScriptIterator instance
 */
export function getScriptIterator(): ScriptIterator {
    if (!iteratorInstance) {
        iteratorInstance = new ScriptIterator();
    }
    return iteratorInstance;
}

/**
 * Reset the iterator instance (for testing)
 */
export function resetScriptIterator(): void {
    iteratorInstance = null;
}
