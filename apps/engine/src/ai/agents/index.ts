/**
 * AI Platform Agents Index
 *
 * Exports all platform-specific agents and related utilities.
 *
 * @module ai/agents
 */

// Base class
export { BasePlatformAgent, type AgentOptions, DEFAULT_AGENT_OPTIONS } from './BasePlatformAgent.js';

// Platform agents
export { TikTokAgent, getTikTokAgent, resetTikTokAgent } from './TikTokAgent.js';
export { ReelsAgent, getReelsAgent, resetReelsAgent } from './ReelsAgent.js';
export { ShortsAgent, getShortsAgent, resetShortsAgent } from './ShortsAgent.js';

// Agent factory
import type { Platform } from '@icerik/shared';
import { getTikTokAgent } from './TikTokAgent.js';
import { getReelsAgent } from './ReelsAgent.js';
import { getShortsAgent } from './ShortsAgent.js';
import type { BasePlatformAgent } from './BasePlatformAgent.js';

/**
 * Get agent instance for a specific platform
 */
export function getAgentForPlatform(platform: Platform): BasePlatformAgent {
    switch (platform) {
        case 'tiktok':
            return getTikTokAgent();
        case 'reels':
            return getReelsAgent();
        case 'shorts':
            return getShortsAgent();
        default:
            throw new Error(`Unknown platform: ${platform}`);
    }
}

/**
 * Get all available agents
 */
export function getAllAgents(): BasePlatformAgent[] {
    return [
        getTikTokAgent(),
        getReelsAgent(),
        getShortsAgent(),
    ];
}
