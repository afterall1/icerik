/**
 * TikTok Platform Agent
 *
 * Specialized AI agent with deep knowledge of TikTok's algorithm.
 * Optimizes content for: watch time, completion rate, loop design.
 *
 * @module ai/agents/TikTokAgent
 */

import type { TrendData } from '@icerik/shared';
import { BasePlatformAgent, type AgentOptions } from './BasePlatformAgent.js';

/**
 * TikTok Algorithm Expert Agent
 *
 * Key TikTok Algorithm Signals (2026):
 * - Watch Time: Total seconds watched (more = better)
 * - Completion Rate: % of video watched (target: 100%+)
 * - Loop Rate: Rewatches boost content significantly
 * - Engagement: Likes, comments, shares, saves
 * - Initial Performance: First 30-60 minutes are critical
 */
export class TikTokAgent extends BasePlatformAgent {
    readonly platform = 'tiktok' as const;
    readonly version = '1.0.0';

    protected getPlatform() {
        return 'tiktok' as const;
    }

    protected buildSystemPrompt(_options: AgentOptions): string {
        return `You are an elite TikTok content strategist and scriptwriter with 5+ years of experience creating viral short-form content. You have deep expertise in TikTok's For You Page (FYP) algorithm and understand exactly what makes content go viral.

## Your TikTok Algorithm Expertise

### Primary Algorithm Signals You Optimize For:
1. **Watch Time** - The total time users spend watching your video is the #1 signal
2. **Completion Rate** - Videos watched to the end (or beyond through loops) perform better
3. **Replay Rate** - Content that triggers rewatches gets massive algorithmic boost
4. **Engagement Velocity** - Likes, comments, shares in the first 30-60 minutes are critical

### Your TikTok-Specific Techniques:

**Hook Mastery (First 1 Second)**:
- "Stop the scroll" hooks that create instant curiosity
- Pattern interrupt techniques: unexpected visuals, sounds, or statements
- No slow intros, logos, or "Hey guys" - straight to the hook

**Pattern Interrupts (Every 2-3 Seconds)**:
- Suggest zoom changes, text overlays, sound effects
- Keep dopamine flowing with constant micro-changes
- Use "wait for it" and suspense-building techniques

**Loop Engineering**:
- Design endings that flow seamlessly into beginnings
- Create "wait, I need to see that again" moments
- Target 100%+ retention through perfect loops

**Comment Bait Strategies**:
- Strategic pauses or "fill in the blank" moments
- Controversial (but safe) opinions that invite discussion
- Questions that demand responses

### Your Output Style:
- Speak in TikTok's native language (casual, authentic, Gen Z friendly)
- Use trending phrases and cultural references
- Include performance cues like [PAUSE], [EMPHASIS], [WHISPER]
- Add visual/sound suggestions in [brackets]

Always format your response with clear [HOOK], [BODY], [CTA], [TITLE], and [HASHTAGS] sections.`;
    }

    protected buildPlatformPrompt(trend: TrendData, options: AgentOptions): string {
        // Calculate duration warning
        const optimalMax = this.algorithmFocus.optimalDuration.max; // 60 for TikTok
        const idealDuration = this.algorithmFocus.optimalDuration.ideal; // 21 for TikTok
        const isOverOptimal = options.durationSeconds > optimalMax;
        const isAboveIdeal = options.durationSeconds > idealDuration;

        const durationWarning = isOverOptimal
            ? `
## ⚠️ TIKTOK DURATION WARNING ⚠️
You are targeting ${options.durationSeconds}s which is ABOVE TikTok's optimal range (${optimalMax}s max).
Videos longer than ${optimalMax}s have SIGNIFICANTLY lower completion rates.
⛔ KEEP IT AS SHORT AS POSSIBLE. Every extra second = lost viewers.
`
            : isAboveIdeal
                ? `
## 📊 TIKTOK DURATION NOTE
Targeting ${options.durationSeconds}s (ideal is ${idealDuration}s).
This is acceptable but shorter = higher completion rate.
✅ Be concise. Cut any filler content.
`
                : `
## ✅ OPTIMAL TIKTOK DURATION
${options.durationSeconds}s is within TikTok's sweet spot (${idealDuration}s ideal).
✅ Perfect length for high completion rates!
`;

        return `${durationWarning}
## TikTok-Specific Requirements

### Hook Engineering (First 1 Second)
Create a hook that will STOP THE SCROLL. Options:
- Shocking statement or statistic
- Unexpected visual suggestion
- Pattern interrupt ("POV:", "Story time:", controversial opener)
- Mystery/curiosity gap ("You won't believe...")

### Content Pacing
- Include [PATTERN INTERRUPT] markers every 2-3 seconds
- Suggest visual changes: zoom, angle, text pop-ups
- Build micro-tension throughout

### Loop Optimization
- Design the ending to connect back to the beginning
- Create a "wait, what?" moment that encourages rewatch
- The last word/frame should trigger curiosity

### TikTok CTA Best Practices
- Don't ask for follows directly (feels desperate)
- Use comment-bait: "What would you do?" or "Am I wrong about this?"
- Create FOMO: "If you want Part 2, let me know"

### Hashtag Strategy
Use ${this.algorithmFocus.hashtagStrategy.count.min}-${this.algorithmFocus.hashtagStrategy.count.max} hashtags:
- 1-2 trending/viral hashtags (#fyp, #viral, #foryou)
- 1-2 niche-specific hashtags related to ${trend.category}
- 1 brand/series hashtag if applicable

### Performance Annotations
Include these markers in your script:
- [ZOOM IN] / [ZOOM OUT] for visual emphasis
- [TEXT: "whatever"] for on-screen text suggestions
- [SOUND: description] for audio cues
- [PAUSE] for dramatic effect
- [SPEED UP] / [SLOW DOWN] for pacing changes
`;
    }

    protected getAppliedOptimizations(options: AgentOptions): string[] {
        const optimizations = [
            'TikTok FYP algorithm optimization',
            '1-second hook engineering',
            'Pattern interrupt markers every 2-3s',
            'Loop-friendly ending design',
            'Comment-bait CTA strategy',
        ];

        if (options.includeHook) {
            optimizations.push('Stop-the-scroll hook formula');
        }

        if (options.includeCta) {
            optimizations.push('Engagement-driving CTA');
        }

        if (options.durationSeconds <= 30) {
            optimizations.push('Optimized for short-form (15-30s sweet spot)');
        }

        return optimizations;
    }

    protected generateDefaultHashtags(trend: TrendData): string[] {
        const categoryHashtags: Record<string, string[]> = {
            technology: ['#tech', '#techtok', '#technology'],
            finance: ['#moneytok', '#finance', '#investing'],
            entertainment: ['#entertainment', '#celebrity', '#trending'],
            gaming: ['#gaming', '#gamer', '#gamertok'],
            lifestyle: ['#lifestyle', '#lifehack', '#tips'],
            news: ['#news', '#breaking', '#newsupdate'],
            drama: ['#storytime', '#drama', '#teatime'],
            sports: ['#sports', '#athlete', '#sportsnews'],
            science: ['#science', '#sciencetok', '#facts'],
            other: ['#trending', '#interesting', '#mustwatch'],
        };

        const baseTags = categoryHashtags[trend.category] || categoryHashtags.other;

        return [
            ...baseTags,
            '#fyp',
            '#viral',
        ].slice(0, 5);
    }
}

/**
 * Singleton instance
 */
let tiktokAgentInstance: TikTokAgent | null = null;

/**
 * Get singleton TikTok agent
 */
export function getTikTokAgent(): TikTokAgent {
    if (!tiktokAgentInstance) {
        tiktokAgentInstance = new TikTokAgent();
    }
    return tiktokAgentInstance;
}

/**
 * Reset agent instance (for testing)
 */
export function resetTikTokAgent(): void {
    tiktokAgentInstance = null;
}
