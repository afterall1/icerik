/**
 * YouTube Shorts Platform Agent
 *
 * Specialized AI agent with deep knowledge of YouTube Shorts algorithm.
 * Optimizes content for: retention rate, subscribe clicks, YouTube SEO.
 *
 * @module ai/agents/ShortsAgent
 */

import type { TrendData } from '@icerik/shared';
import { BasePlatformAgent, type AgentOptions } from './BasePlatformAgent.js';

/**
 * YouTube Shorts Algorithm Expert Agent
 *
 * Key Shorts Algorithm Signals (2026):
 * - Viewed vs Swiped Away: Target 70%+ viewed rate
 * - Retention Rate: 100%+ retention = viral potential
 * - Subscribe Clicks: Strong signal for channel growth
 * - Fresh Content: 28-day content lifecycle
 * - YouTube Search: Shorts appear in search results
 */
export class ShortsAgent extends BasePlatformAgent {
    readonly platform = 'shorts' as const;
    readonly version = '1.0.0';

    protected getPlatform() {
        return 'shorts' as const;
    }

    protected buildSystemPrompt(_options: AgentOptions): string {
        return `You are an elite YouTube Shorts strategist with deep expertise in the Shorts algorithm and YouTube's broader ecosystem. You understand that Shorts is unique because it connects to the larger YouTube platform - search, subscriptions, and long-form content.

## Your YouTube Shorts Algorithm Expertise

### Primary Algorithm Signals You Optimize For:
1. **Viewed vs Swiped Away Rate** - Target 70%+ viewed rate (not swiped away)
2. **Retention Rate** - 100%+ retention (through loops) indicates viral potential
3. **Subscribe Clicks** - Shorts can drive massive channel growth
4. **YouTube Search Integration** - Shorts appear in search results

### Your Shorts-Specific Techniques:

**Anti-Swipe Hook Strategy (First 3 Seconds)**:
- Prevent the swipe-away with immediate value promise
- Bold claims that demand verification
- Visual pattern interrupts that catch attention
- "You need to know this..." urgency framing

**Retention Engineering**:
- Build towards a payoff that requires full watch
- Use "wait for it" moments strategically
- Design seamless loops for rewatch behavior
- Create information gaps that close at the end

**YouTube Ecosystem Leverage**:
- Subscribe CTAs that feel natural, not desperate
- Bridge to long-form content ("Full video on my channel")
- Playlist integration suggestions
- Community tab tie-ins

**YouTube SEO Optimization**:
- Title optimized for YouTube search
- Description with searchable keywords
- Strategic use of trending topics for discovery

### Your Output Style:
- Slightly more polished than TikTok, matches YouTube's vibe
- Educational/informative framing works exceptionally well
- Include [SUBSCRIBE PROMPT] cues at strategic moments
- Add [SEARCH KEYWORD: term] for SEO optimization

Always format your response with clear [HOOK], [BODY], [CTA], [TITLE], and [HASHTAGS] sections.`;
    }

    protected buildPlatformPrompt(trend: TrendData, _options: AgentOptions): string {
        return `
## YouTube Shorts-Specific Requirements

### Anti-Swipe Hook (First 3 Seconds)
Create a hook that PREVENTS the swipe-away:
- Start with immediate value or shocking information
- Use "Here's what you need to know..." framing
- Bold statement that demands the viewer to verify
- Visual suggestion for attention-grabbing opening

### Retention Architecture
Design for 100%+ retention:
- Build clear progression toward a payoff
- Create "I need to see how this ends" tension
- Position the key revelation strategically
- Design ending that loops smoothly to the beginning

### YouTube Ecosystem Integration
Leverage YouTube's unique features:
- Natural subscribe prompt ("If you want more like this...")
- Long-form content bridge ("Full breakdown on my channel")
- Comment engagement for algorithm boost
- Future video teases

### YouTube SEO Strategy
Optimize for YouTube search:
- Title: Clear, searchable, benefit-focused
- Include primary keyword in title
- Description: 2-3 sentences with keywords
- Suggest related search terms people might use

### Shorts CTA Best Practices
- Subscribe prompts work better here than TikTok/Reels
- "Subscribe for Part 2" or "Hit subscribe for more"
- Comment engagement: "Drop a 🔥 if you learned something"
- Channel direction: "Check my channel for the full story"

### Hashtag Strategy
Use ${this.algorithmFocus.hashtagStrategy.count.min}-${this.algorithmFocus.hashtagStrategy.count.max} hashtags:
- #Shorts is optional but can help discovery
- Category-specific hashtags for ${trend.category}
- Trending topic hashtags when relevant
- Place in description, not title

### Content Annotations
Include these markers:
- [RETENTION HOOK: description] for key engagement points
- [SUBSCRIBE MOMENT] for optimal subscription prompt timing
- [SEARCH KEYWORD: term] for SEO-important keywords
- [LOOP POINT] where seamless loop should occur
- [LONG-FORM BRIDGE: topic] for channel content tie-in
`;
    }

    protected getAppliedOptimizations(options: AgentOptions): string[] {
        const optimizations = [
            'YouTube Shorts algorithm optimization',
            'Anti-swipe hook engineering (3-second rule)',
            '100%+ retention architecture',
            'YouTube SEO integration',
            'Subscribe conversion optimization',
        ];

        if (options.includeHook) {
            optimizations.push('Swipe-prevention hook formula');
        }

        if (options.includeCta) {
            optimizations.push('YouTube ecosystem CTA (subscribe + channel)');
        }

        return optimizations;
    }

    protected generateDefaultHashtags(trend: TrendData): string[] {
        const categoryHashtags: Record<string, string[]> = {
            technology: ['#tech', '#technology', '#techshorts'],
            finance: ['#finance', '#money', '#investing'],
            entertainment: ['#entertainment', '#trending', '#viral'],
            gaming: ['#gaming', '#gamer', '#gamingshorts'],
            lifestyle: ['#lifestyle', '#tips', '#howto'],
            news: ['#news', '#breaking', '#update'],
            drama: ['#storytime', '#story', '#drama'],
            sports: ['#sports', '#highlights', '#athlete'],
            science: ['#science', '#facts', '#learn'],
            other: ['#shorts', '#trending', '#viral'],
        };

        const baseTags = categoryHashtags[trend.category] || categoryHashtags.other;

        return [
            '#Shorts',
            ...baseTags,
        ].slice(0, 5);
    }
}

/**
 * Singleton instance
 */
let shortsAgentInstance: ShortsAgent | null = null;

/**
 * Get singleton Shorts agent
 */
export function getShortsAgent(): ShortsAgent {
    if (!shortsAgentInstance) {
        shortsAgentInstance = new ShortsAgent();
    }
    return shortsAgentInstance;
}

/**
 * Reset agent instance (for testing)
 */
export function resetShortsAgent(): void {
    shortsAgentInstance = null;
}
