# Multi-Platform Agent System Architecture

> **Module**: `apps/engine/src/ai/agents/`, `apps/engine/src/ai/orchestrator/`, `apps/engine/src/ai/supervisor/`  
> **Son Güncelleme**: 24 Ocak 2026  
> **Phase**: 11-12

---

## Overview

Template Method pattern ile platform-specific AI content generation. Her platform (TikTok, Reels, Shorts) kendi algoritma bilgisini içeren özelleştirilmiş agent'a sahip.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MultiPlatformOrchestrator                        │
│                  (Parallel platform generation)                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   TikTokAgent    │ │   ReelsAgent     │ │   ShortsAgent    │
│                  │ │                  │ │                  │
│ • Watch time     │ │ • Shares/Saves   │ │ • Retention rate │
│ • Completion     │ │ • Aesthetics     │ │ • Subscribe CTA  │
│ • Loop design    │ │ • Grid-friendly  │ │ • SEO focus      │
└────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              ▼
              ┌───────────────────────────────┐
              │       BasePlatformAgent       │
              │     (Template Method Base)    │
              │                               │
              │ • buildSystemPrompt()         │
              │ • buildContentPrompt()        │
              │ • parseResponse()             │
              │ • generateScript()            │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │       SupervisorAgent         │
              │   (Validation + Retry Loop)   │
              │                               │
              │ • Validates output            │
              │ • Max 3 retries               │
              │ • Quality assurance           │
              └───────────────────────────────┘
```

---

## Components

### 1. BasePlatformAgent (Abstract)

**Location**: `apps/engine/src/ai/agents/BasePlatformAgent.ts`  
**Pattern**: Template Method

```typescript
abstract class BasePlatformAgent implements PlatformAlgorithmExpert {
    abstract readonly platform: Platform;
    
    // Template methods (override in subclasses)
    protected abstract getAlgorithmFocus(): PlatformAlgorithmFocus;
    protected abstract getVisualStyle(): VisualStyle;
    protected abstract getAudioStyle(): AudioStyle;
    
    // Shared implementation
    async generateScript(trend: TrendData, options: AgentOptions): Promise<PlatformScript>;
    protected buildSystemPrompt(): string;
    protected buildContentPrompt(trend: TrendData, options: AgentOptions): string;
}
```

**Key Feature**: Knowledge injection - her agent kendi platform knowledge'ını prompt'a ekler.

---

### 2. Platform Agents

| Agent | File | Primary Metrics | Optimal Duration |
|-------|------|-----------------|------------------|
| `TikTokAgent` | `TikTokAgent.ts` | watch_time, completion_rate, shares | 15-30s (ideal: 21s) |
| `ReelsAgent` | `ReelsAgent.ts` | shares, saves, profile_visits | 15-60s (ideal: 30s) |
| `ShortsAgent` | `ShortsAgent.ts` | viewed_vs_swiped, retention_rate | 15-60s (ideal: 30s) |

**Example - TikTokAgent Focus:**
```typescript
{
    primaryMetrics: ['watch_time', 'completion_rate', 'shares', 'comments'],
    hookTiming: { criticalSeconds: 1, reHookFrequency: 3 },
    loopDesign: { recommended: true, description: 'End should connect to beginning' },
    ctaGuidance: 'No explicit CTAs - use comment bait instead',
}
```

---

### 3. MultiPlatformOrchestrator

**Location**: `apps/engine/src/ai/orchestrator/MultiPlatformOrchestrator.ts`  
**Pattern**: Singleton

Parallel script generation for multiple platforms.

```typescript
class MultiPlatformOrchestrator {
    async generateForPlatforms(
        trend: TrendData,
        platforms: Platform[],
        options: MultiPlatformOptions
    ): Promise<GenerationResult>;
    
    async retryFailed(
        previousResult: GenerationResult,
        options: MultiPlatformOptions
    ): Promise<GenerationResult>;
    
    getComparisonSummary(result: GenerationResult): ComparisonSummary;
}
```

**Features:**
- Parallel execution (Promise.allSettled)
- Per-platform error isolation
- Comparison summary generation

---

### 4. SupervisorAgent

**Location**: `apps/engine/src/ai/supervisor/SupervisorAgent.ts`  
**Pattern**: Singleton

Validation and retry loop for quality assurance.

```typescript
interface SupervisedOptions {
    maxRetries?: number;      // Default: 2
    enableValidation?: boolean; // Default: true
}

class SupervisorAgent {
    async generateSupervised(
        trend: TrendData,
        platforms: Platform[],
        options: SupervisedOptions
    ): Promise<SupervisedResult>;
}
```

**Validation Flow:**
```
Generate → Validate → Pass? → Return
              ↓ Fail
         Retry (max 3) → Return with warnings
```

---

### 5. ScriptValidator

**Location**: `apps/engine/src/ai/validation/ScriptValidator.ts`

Validates generated scripts against platform rules.

**Validation Rules:**
| Rule | Description |
|------|-------------|
| `minHookLength` | Hook must be at least N words |
| `maxDuration` | Script not too long for platform |
| `hasStructure` | Hook + Body + CTA present |
| `platformCompliance` | Platform-specific checks |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate-scripts` | POST | Multi-platform generation |
| `/api/generate-scripts/retry` | POST | Retry failed platforms |
| `/api/platforms` | GET | List platforms with capabilities |
| `/api/platforms/:platform/tips` | GET | Platform optimization tips |

---

## Usage Example

```typescript
import { getOrchestrator } from './ai/orchestrator/index.js';

const orchestrator = getOrchestrator();
const result = await orchestrator.generateForPlatforms(
    trend,
    ['tiktok', 'reels', 'shorts'],
    { durationSeconds: 30, tone: 'casual', language: 'tr' }
);

// result.scripts: PlatformScript[] for each platform
// result.errors: { platform, error }[] for failures
```

---

## Type Exports

```typescript
// From @icerik/shared
export type Platform = 'tiktok' | 'reels' | 'shorts';
export const ALL_PLATFORMS: readonly Platform[];
export const PLATFORM_LABELS: Record<Platform, string>;
export const PLATFORM_ALGORITHM_FOCUS: Record<Platform, PlatformAlgorithmFocus>;

// From agents/index.ts
export { getTikTokAgent, getReelsAgent, getShortsAgent, getAgentForPlatform };
```
