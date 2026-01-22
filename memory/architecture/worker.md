# Background Worker Architecture

> **Module**: `apps/engine/src/worker/`  
> **Son Güncelleme**: 22 Ocak 2026

---

## Overview

Tier-based background polling system for Reddit data with graceful shutdown handling.

---

## Components

### 1. Scheduler (`scheduler.ts`)

Manages tier-based polling intervals.

**Polling Tiers:**
| Tier | Interval | Subreddits |
|------|----------|------------|
| 1 | 5 minutes | High-volume (wallstreetbets, technology, etc.) |
| 2 | 15 minutes | Medium-volume |
| 3 | 30 minutes | Low-volume |

**Features:**
- **Jitter**: ±10% randomness to prevent thundering herd
- **Retry**: Exponential backoff (3 retries max)
- **Stats Tracking**: Success/failure counts per job

**Key Methods:**
- `initialize()` - Group subreddits by tier
- `startAll()` / `stopAll()` - Control polling
- `forceRun(tier)` - Immediate poll
- `getStatus()` - Job status array
- `getStats()` - Aggregate statistics

---

### 2. Worker (`worker.ts`)

Orchestrates polling, processing, and caching.

**Poll Flow:**
```
1. Fetch posts from Reddit (tier subreddits)
2. Process through NES calculator
3. Update subreddit stats (for baseline)
4. Cache by category
5. Cache all trends
6. Generate and cache summary
7. Cleanup expired cache
```

**Graceful Shutdown:**
- Handles `SIGTERM`, `SIGINT`, `SIGHUP`
- Stops scheduler
- Closes database connection

---

## Usage

### Start with Worker
```bash
npm run dev -- --with-worker
```

### Worker API Endpoints
```
GET  /api/worker/status     # Job status
POST /api/worker/start      # Start polling
POST /api/worker/stop       # Stop polling
POST /api/worker/force-run/1  # Force poll tier 1
```

---

## Worker Status Response

```typescript
{
    isRunning: boolean;
    isShuttingDown: boolean;
    scheduler: {
        totalJobs: number;
        activeJobs: number;
        totalSubreddits: number;
        totalSuccesses: number;
        totalFailures: number;
    };
    jobs: [
        {
            id: "tier-1";
            tier: 1;
            subredditCount: 15;
            intervalMinutes: 5;
            active: true;
            lastRun: "2026-01-22T20:00:00Z";
            nextRun: "2026-01-22T20:05:00Z";
            successCount: 42;
            failureCount: 0;
        },
        // ...
    ];
}
```

---

## Sequence Diagram

```
┌────────────┐     ┌───────────┐     ┌────────────┐     ┌─────────┐
│  Scheduler │     │  Worker   │     │   Reddit   │     │  Cache  │
└─────┬──────┘     └─────┬─────┘     └─────┬──────┘     └────┬────┘
      │                  │                 │                 │
      │ setInterval(5m)  │                 │                 │
      │─────────────────►│                 │                 │
      │                  │                 │                 │
      │                  │ fetch(tier-1)   │                 │
      │                  │────────────────►│                 │
      │                  │                 │                 │
      │                  │ posts[]         │                 │
      │                  │◄────────────────│                 │
      │                  │                 │                 │
      │                  │ NES calculation │                 │
      │                  │─────────────────│                 │
      │                  │                 │                 │
      │                  │                 │ setTrends()     │
      │                  │─────────────────┼────────────────►│
      │                  │                 │                 │
      │                  │ cleanupExpired()│                 │
      │                  │─────────────────┼────────────────►│
      │                  │                 │                 │
```
