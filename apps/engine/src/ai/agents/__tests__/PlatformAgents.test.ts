/**
 * Platform Agents Tests
 *
 * Tests for platform-specific agents (TikTok, Reels, Shorts).
 * Verifies that each agent produces platform-appropriate prompts and optimizations.
 *
 * @module ai/agents/__tests__/PlatformAgents.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TikTokAgent, resetTikTokAgent } from '../TikTokAgent';
import { ReelsAgent, resetReelsAgent } from '../ReelsAgent';
import { ShortsAgent, resetShortsAgent } from '../ShortsAgent';
import { getAgentForPlatform } from '../index';

// Mock the gemini client
vi.mock('../../gemini.js', () => ({
    getGeminiClient: vi.fn(() => ({
        isConfigured: vi.fn().mockReturnValue(true),
        generateContent: vi.fn().mockResolvedValue(`
[HOOK]
This is a test hook

[BODY]
This is the main body content of the script

[CTA]
Subscribe for more content

[TITLE]
Amazing Test Video

[HASHTAGS]
#test #viral #trending
        `),
    })),
    GeminiError: class GeminiError extends Error {
        constructor(message: string, public statusCode?: number, public retryable = false) {
            super(message);
        }
    },
}));

// Mock logger
vi.mock('../../../utils/logger.js', () => ({
    createChildLogger: vi.fn(() => ({
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    })),
}));

describe('Platform Agents', () => {
    beforeEach(() => {
        resetTikTokAgent();
        resetReelsAgent();
        resetShortsAgent();
    });

    describe('getAgentForPlatform', () => {
        it('should return TikTokAgent for tiktok', () => {
            const agent = getAgentForPlatform('tiktok');
            expect(agent).toBeInstanceOf(TikTokAgent);
            expect(agent.platform).toBe('tiktok');
        });

        it('should return ReelsAgent for reels', () => {
            const agent = getAgentForPlatform('reels');
            expect(agent).toBeInstanceOf(ReelsAgent);
            expect(agent.platform).toBe('reels');
        });

        it('should return ShortsAgent for shorts', () => {
            const agent = getAgentForPlatform('shorts');
            expect(agent).toBeInstanceOf(ShortsAgent);
            expect(agent.platform).toBe('shorts');
        });

        it('should throw for unknown platform', () => {
            expect(() => getAgentForPlatform('unknown' as never)).toThrow('Unknown platform');
        });
    });

    describe('TikTokAgent', () => {
        it('should have correct platform identifier', () => {
            const agent = new TikTokAgent();
            expect(agent.platform).toBe('tiktok');
        });

        it('should have version number', () => {
            const agent = new TikTokAgent();
            expect(agent.version).toBeDefined();
            expect(typeof agent.version).toBe('string');
        });

        it('should return correct optimal duration', () => {
            const agent = new TikTokAgent();
            const duration = agent.getOptimalDuration();
            expect(duration.min).toBe(15);
            expect(duration.max).toBe(60);
            expect(duration.ideal).toBe(21);
        });

        it('should return TikTok as platform label', () => {
            const agent = new TikTokAgent();
            expect(agent.getPlatformLabel()).toBe('TikTok');
        });
    });

    describe('ReelsAgent', () => {
        it('should have correct platform identifier', () => {
            const agent = new ReelsAgent();
            expect(agent.platform).toBe('reels');
        });

        it('should return correct optimal duration', () => {
            const agent = new ReelsAgent();
            const duration = agent.getOptimalDuration();
            expect(duration.min).toBe(15);
            expect(duration.max).toBe(90);
            expect(duration.ideal).toBe(30);
        });

        it('should return Instagram Reels as platform label', () => {
            const agent = new ReelsAgent();
            expect(agent.getPlatformLabel()).toBe('Instagram Reels');
        });
    });

    describe('ShortsAgent', () => {
        it('should have correct platform identifier', () => {
            const agent = new ShortsAgent();
            expect(agent.platform).toBe('shorts');
        });

        it('should return correct optimal duration', () => {
            const agent = new ShortsAgent();
            const duration = agent.getOptimalDuration();
            expect(duration.min).toBe(15);
            expect(duration.max).toBe(60);
            expect(duration.ideal).toBe(30);
        });

        it('should return YouTube Shorts as platform label', () => {
            const agent = new ShortsAgent();
            expect(agent.getPlatformLabel()).toBe('YouTube Shorts');
        });
    });

    describe('Algorithm Focus', () => {
        it('TikTok should prioritize watch_time and completion_rate', () => {
            const agent = new TikTokAgent();
            const focus = agent.getAlgorithmFocus();
            expect(focus.primaryMetrics).toContain('watch_time');
            expect(focus.primaryMetrics).toContain('completion_rate');
        });

        it('Reels should prioritize initial_engagement and shares', () => {
            const agent = new ReelsAgent();
            const focus = agent.getAlgorithmFocus();
            expect(focus.primaryMetrics).toContain('initial_engagement');
            expect(focus.primaryMetrics).toContain('shares');
        });

        it('Shorts should prioritize viewed_vs_swiped and retention_rate', () => {
            const agent = new ShortsAgent();
            const focus = agent.getAlgorithmFocus();
            expect(focus.primaryMetrics).toContain('viewed_vs_swiped');
            expect(focus.primaryMetrics).toContain('retention_rate');
        });
    });

    describe('Hook Timing', () => {
        it('TikTok should have 1 second critical hook timing', () => {
            const agent = new TikTokAgent();
            const focus = agent.getAlgorithmFocus();
            expect(focus.hookTiming.criticalSeconds).toBe(1);
        });

        it('Reels should have 3 second critical hook timing', () => {
            const agent = new ReelsAgent();
            const focus = agent.getAlgorithmFocus();
            expect(focus.hookTiming.criticalSeconds).toBe(3);
        });

        it('Shorts should have 3 second critical hook timing', () => {
            const agent = new ShortsAgent();
            const focus = agent.getAlgorithmFocus();
            expect(focus.hookTiming.criticalSeconds).toBe(3);
        });
    });

    describe('Hashtag Strategy', () => {
        it('TikTok should recommend 3-5 hashtags', () => {
            const agent = new TikTokAgent();
            const focus = agent.getAlgorithmFocus();
            expect(focus.hashtagStrategy.count.min).toBe(3);
            expect(focus.hashtagStrategy.count.max).toBe(5);
        });

        it('Reels should recommend 5-10 hashtags', () => {
            const agent = new ReelsAgent();
            const focus = agent.getAlgorithmFocus();
            expect(focus.hashtagStrategy.count.min).toBe(5);
            expect(focus.hashtagStrategy.count.max).toBe(10);
        });

        it('Shorts should recommend 3-5 hashtags', () => {
            const agent = new ShortsAgent();
            const focus = agent.getAlgorithmFocus();
            expect(focus.hashtagStrategy.count.min).toBe(3);
            expect(focus.hashtagStrategy.count.max).toBe(5);
        });
    });
});
