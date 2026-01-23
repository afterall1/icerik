/**
 * Instagram Reels Platform Agent
 *
 * Specialized AI agent with deep knowledge of Instagram Reels algorithm.
 * Optimizes content for: shareability, saves, initial engagement, aesthetics.
 *
 * @module ai/agents/ReelsAgent
 */

import type { TrendData } from '@icerik/shared';
import { BasePlatformAgent, type AgentOptions } from './BasePlatformAgent.js';

/**
 * Instagram Reels Algorithm Expert Agent
 *
 * Key Reels Algorithm Signals (2026):
 * - Initial Engagement: First 30 minutes determine reach
 * - Shares: DM shares are the strongest signal
 * - Saves: Indicates high-value content
 * - Watch Time: But shares/saves weighted higher than TikTok
 * - Audio: Original audio can spread virally
 */
export class ReelsAgent extends BasePlatformAgent {
    readonly platform = 'reels' as const;
    readonly version = '1.0.0';

    protected getPlatform() {
        return 'reels' as const;
    }

    protected buildSystemPrompt(_options: AgentOptions): string {
        return `You are an elite Instagram Reels content strategist with mastery of the Instagram algorithm. You understand that Reels is different from TikTok - it prioritizes shareability, aesthetic appeal, and community engagement over pure watch time.

## Your Instagram Reels Algorithm Expertise

### Primary Algorithm Signals You Optimize For:
1. **Shares** - DM shares are the #1 signal. Create "send this to..." content
2. **Saves** - Content worth revisiting ranks higher
3. **Initial Engagement** - First 30 minutes determine your reach ceiling
4. **Comments** - Real conversations (not just emoji spam) boost visibility

### Your Reels-Specific Techniques:

**Aesthetic Hook Strategy (First 3 Seconds)**:
- Visually striking opening that fits Instagram's polished aesthetic
- Grid-friendly cover frame suggestion
- Clean, premium feel even for casual content

**Shareability Engineering**:
- "Tag someone who..." or "Send this to your friend who..."
- Relatable scenarios that trigger "OMG this is so me" DMs
- Useful content people save for later reference

**Caption Optimization**:
- Strong first line (shows in feed preview)
- Strategic emoji use for readability
- CTA positioned after value delivery
- SEO-friendly for Explore page discovery

**Instagram Ecosystem Integration**:
- Story bridge suggestions ("See my Story for more")
- Cross-pollination with other Instagram features
- Carousel-to-Reels funnel ideas

### Your Output Style:
- Premium, polished language matching Instagram's vibe
- Lifestyle-oriented framing even for technical topics
- Include aesthetic cues like [CLEAN TRANSITION], [SOFT LIGHTING]
- Suggest visually appealing text overlay styles

Always format your response with clear [HOOK], [BODY], [CTA], [TITLE], and [HASHTAGS] sections.`;
    }

    protected buildPlatformPrompt(trend: TrendData, _options: AgentOptions): string {
        return `
## Instagram Reels-Specific Requirements

### Aesthetic Hook (First 3 Seconds)
Create a visually appealing opening that:
- Suggests a clean, grid-friendly cover frame
- Uses Instagram's preferred aesthetic (polished, aspirational)
- Includes visual suggestions for color grading, lighting

### Shareability Focus
Design the content to trigger DM shares:
- Include a "Send this to..." moment
- Create relatable, meme-worthy scenarios
- Build "OMG I had to share this" reactions

### Save-Worthy Elements
Make viewers want to save and rewatch:
- Pack in useful information or tips
- Create list-style content ("3 things you need to know...")
- Include quotable/screenshot-worthy moments

### Caption Strategy
Provide a caption that:
- Opens with a strong hook (first line shows in feed)
- Uses 3-5 relevant emojis strategically
- Ends with a soft CTA
- Is optimized for Instagram search/SEO

### Instagram CTA Best Practices
- Softer approach than TikTok (less aggressive)
- "Save this for later" performs well
- "Share with someone who needs this"
- Story mentions: "Tap my Story for the full breakdown"

### Hashtag Strategy
Use ${this.algorithmFocus.hashtagStrategy.count.min}-${this.algorithmFocus.hashtagStrategy.count.max} hashtags:
- Mix of discovery hashtags (#reels, #explore, #trending)
- Niche hashtags related to ${trend.category}
- Branded/community hashtags
- Place in caption (not comments) for 2026 algorithm

### Visual Annotations
Include these markers:
- [COVER FRAME: description] for thumbnail suggestion
- [TRANSITION: type] e.g., smooth zoom, swipe
- [TEXT OVERLAY: "text" - style] for on-screen text
- [AESTHETIC: description] for visual mood guidance
- [CAPTION PREVIEW: first line] for feed preview optimization
`;
    }

    protected getAppliedOptimizations(options: AgentOptions): string[] {
        const optimizations = [
            'Instagram Reels algorithm optimization',
            'Shareability-focused content design',
            'Grid-friendly cover frame suggestions',
            'Caption SEO optimization',
            'Save-worthy content structure',
        ];

        if (options.includeHook) {
            optimizations.push('Aesthetic-first hook design');
        }

        if (options.includeCta) {
            optimizations.push('Soft CTA with share/save prompts');
        }

        return optimizations;
    }

    protected generateDefaultHashtags(trend: TrendData): string[] {
        const categoryHashtags: Record<string, string[]> = {
            technology: ['#tech', '#technology', '#innovation'],
            finance: ['#finance', '#money', '#investing'],
            entertainment: ['#entertainment', '#celebrity', '#pop'],
            gaming: ['#gaming', '#gamer', '#games'],
            lifestyle: ['#lifestyle', '#lifehacks', '#tips'],
            news: ['#news', '#breaking', '#current'],
            drama: ['#storytime', '#drama', '#relatable'],
            sports: ['#sports', '#athlete', '#fitness'],
            science: ['#science', '#facts', '#learn'],
            other: ['#trending', '#viral', '#explore'],
        };

        const baseTags = categoryHashtags[trend.category] || categoryHashtags.other;

        return [
            ...baseTags,
            '#reels',
            '#reelsinstagram',
            '#explore',
            '#viral',
        ].slice(0, 8);
    }

    /**
     * Instagram Reels Visual Style Guide
     * Aesthetic, polished visuals optimized for shareability
     */
    getVisualStyle() {
        return {
            aesthetic: 'aesthetic' as const,
            textStyles: {
                fontWeight: 'regular' as const,
                fontSize: 'medium' as const,
                animation: 'fade' as const,
            },
            colors: {
                primary: '#833AB4',   // Instagram purple
                accent: '#FD1D1D',    // Instagram gradient red
                text: '#FFFFFF',
                background: '#121212',
            },
            thumbnailGuidance: 'Clean, grid-friendly cover. Aesthetic feel, lifestyle-oriented. Text should be minimal and elegant.',
        };
    }

    /**
     * Instagram Reels Audio Recommendations
     * Original audio preferred, medium intensity
     */
    getAudioStyle() {
        return {
            preferredType: 'original' as const,
            voiceStyle: 'calm' as const,
            musicIntensity: 'medium' as const,
            guidance: 'Original audio can go viral. Calm, conversational voiceover. Background music should complement, not overpower.',
        };
    }
}

/**
 * Singleton instance
 */
let reelsAgentInstance: ReelsAgent | null = null;

/**
 * Get singleton Reels agent
 */
export function getReelsAgent(): ReelsAgent {
    if (!reelsAgentInstance) {
        reelsAgentInstance = new ReelsAgent();
    }
    return reelsAgentInstance;
}

/**
 * Reset agent instance (for testing)
 */
export function resetReelsAgent(): void {
    reelsAgentInstance = null;
}
