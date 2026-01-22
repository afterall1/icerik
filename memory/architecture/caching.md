# Caching System Architecture

> **Module**: `apps/engine/src/cache/`  
> **Son Güncelleme**: 22 Ocak 2026

---

## Overview

SQLite-based caching layer with TTL support, hit tracking, and request logging.

---

## Components

### 1. Database (`database.ts`)

Singleton SQLite connection with WAL mode.

**Key Functions:**
- `getDatabase()` - Singleton instance
- `closeDatabase()` - Graceful shutdown
- `clearAllCache()` - Full reset
- `getDatabaseStats()` - Monitoring metrics

**Schema:**
```sql
-- Trend cache with TTL
CREATE TABLE trend_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT NOT NULL UNIQUE,
    data TEXT NOT NULL,  -- JSON serialized
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    hit_count INTEGER NOT NULL DEFAULT 0
);

-- Subreddit statistics for NES baseline
CREATE TABLE subreddit_stats (
    subreddit TEXT NOT NULL UNIQUE,
    avg_score REAL,
    avg_comments REAL,
    post_count INTEGER,
    last_updated TEXT
);

-- Request log for analytics
CREATE TABLE request_log (
    endpoint TEXT NOT NULL,
    cache_hit INTEGER,
    response_time_ms INTEGER,
    created_at TEXT
);
```

---

### 2. CacheService (`CacheService.ts`)

High-level caching operations.

**TTL Constants:**
```typescript
const CACHE_TTL = {
    TRENDS: 5 * 60,        // 5 minutes
    SUMMARY: 10 * 60,      // 10 minutes
    SUBREDDIT_STATS: 60 * 60,  // 1 hour
};
```

**Key Methods:**
- `getTrends(query, subreddit?)` - Cache lookup
- `setTrends(query, data, subreddit?, ttl?)` - Cache write
- `getSummary()` / `setSummary()` - Summary caching
- `invalidateByPrefix(prefix)` - Pattern invalidation
- `invalidateByCategory(category)` - Category invalidation
- `cleanupExpired()` - TTL cleanup
- `getStats()` - Hit rate, entry counts

---

## Cache Key Generation

```typescript
function generateCacheKey(prefix: string, params: Record<string, unknown>): string {
    // Sort keys for deterministic ordering
    const sortedParams = Object.keys(params)
        .sort()
        .filter(key => params[key] !== undefined)
        .map(key => `${key}=${params[key]}`)
        .join('&');
    
    return `${prefix}:${sortedParams || 'default'}`;
}

// Example: "trends:category=technology&limit=20&sortBy=nes&timeRange=day"
```

---

## Cache Flow

```
┌─────────────┐    Cache Miss    ┌──────────────┐
│   Request   │ ───────────────► │  Reddit API  │
└─────────────┘                  └──────────────┘
       │                                │
       │ Cache Hit                      │
       ▼                                ▼
┌─────────────┐                  ┌──────────────┐
│   SQLite    │ ◄─────────────── │  Cache Write │
│   Cache     │                  │  + Headers   │
└─────────────┘                  └──────────────┘
       │
       ▼
┌─────────────┐
│  X-Cache:   │
│  HIT/MISS   │
└─────────────┘
```

---

## Maintenance

**Automatic Cleanup:**
- Worker polls call `cleanupExpired()` after each poll
- Manual via `POST /api/cache/cleanup`

**Monitoring:**
- `GET /api/status` includes cache stats
- Hit rate tracked in `request_log` table
