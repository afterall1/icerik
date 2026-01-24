# Local Storage Architecture

> **Updated**: 25 Ocak 2026  
> **Phase**: 16-18, 23

---

## Overview

Browser-native storage architecture providing content management and analytics without backend authentication.

---

## Storage Technologies

| Technology | Use Case | Limit |
|------------|----------|-------|
| **localStorage** | Analytics, settings | ~5MB |
| **IndexedDB** | Ratings, history | ~50MB+ |

---

## Hooks

### 1. useFavorites (localStorage)

**Key**: `icerik_favorites`  
**Location**: `apps/dashboard/src/lib/useFavorites.ts`  
**Max Items**: 100

```typescript
interface FavoriteTrend {
    id: string;
    title: string;
    subreddit: string;
    category: string;
    nes: number;
    savedAt: string;
}
```

**API**:
- `favorites: FavoriteTrend[]`
- `isFavorite(id): boolean`
- `toggleFavorite(trend): void`
- `clearFavorites(): void`

---

### 2. useScriptHistory (IndexedDB)

**Database**: `icerik_history`  
**Store**: `scripts`  
**Location**: `apps/dashboard/src/lib/useScriptHistory.ts`  
**Max Items**: 50

```typescript
interface ScriptHistoryEntry {
    id: string;
    trendId: string;
    trendTitle: string;
    platform: Platform;
    script: PlatformScript;
    createdAt: string;
}
```

**Indexes**:
- `trendId` - by trend
- `createdAt` - by date (descending)

---

### 3. useScriptRating (IndexedDB)

**Database**: `icerik_analytics`  
**Store**: `ratings`  
**Location**: `apps/dashboard/src/lib/useScriptRating.ts`

```typescript
interface ScriptRating {
    id: string;
    scriptId: string;
    trendId: string;
    trendTitle: string;
    platform: Platform;
    rating: 'like' | 'dislike';
    stars?: number; // 1-5
    feedback?: string;
    createdAt: string;
}
```

**Indexes**:
- `scriptId` - unique per script
- `platform` - analytics breakdown
- `createdAt` - chronological

---

### 4. useAnalytics (localStorage)

**Key**: `icerik_analytics`  
**Location**: `apps/dashboard/src/lib/useAnalytics.ts`

```typescript
interface AnalyticsData {
    totalScriptsGenerated: number;
    totalCopies: number;
    totalExports: number;
    totalIterations: number;
    totalModalOpens: number;
    totalFavorites: number;
    byPlatform: Record<Platform, PlatformStats>;
    byCategory: Record<string, number>;
    sessionsCount: number;
    totalModalTimeSeconds: number;
    firstActivityAt: string;
    lastActivityAt: string;
}
```

**Events Tracked**:
- `script_generated`
- `script_copied`
- `script_exported`
- `script_iterated`
- `modal_opened/closed`
- `trend_favorited/unfavorited`

---

### 5. useExport (No storage)

**Location**: `apps/dashboard/src/lib/useExport.ts`

Export formats:
- **Markdown** (`.md`) - Human readable
- **JSON** (`.json`) - Machine parseable

---

### 6. useVisualSelections (IndexedDB) - Phase 23 NEW

**Database**: `icerik_visual_selections`  
**Store**: `selections`  
**Location**: `apps/dashboard/src/lib/useVisualSelections.ts`  
**Max Items**: 2 per section

```typescript
interface SelectedVisual {
    id: string;
    imageId: string;
    scriptId: string;
    sectionType: 'hook' | 'body' | 'cta';
    order: number; // 1 or 2
    image: ValidatedImage;
    addedAt: string;
}

interface ScriptVisualSelections {
    scriptId: string;
    platform: 'tiktok' | 'reels' | 'shorts';
    trendId: string;
    scriptTitle: string;
    selections: {
        hook: SelectedVisual[];
        body: SelectedVisual[];
        cta: SelectedVisual[];
    };
    createdAt: string;
    updatedAt: string;
}
```

**Indexes**:
- `scriptId` - primary key
- `platform` - grouping
- `updatedAt` - chronological

**API**:
- `addSelection(sectionType, image): Promise<boolean>`
- `removeSelection(sectionType, imageId): Promise<void>`
- `isSelected(sectionType, imageId): boolean`
- `getSelectionOrder(sectionType, imageId): number`
- `isSectionFull(sectionType): boolean`
- `clearAllSelections(): Promise<void>`

---

## UI Components

| Component | Hook Used | Location |
|-----------|-----------|----------|
| FavoriteButton | useFavorites | atoms |
| FavoritesPanel | useFavorites | molecules |
| HistoryPanel | useScriptHistory | molecules |
| RatingPanel | useScriptRating | molecules |
| AnalyticsPanel | useAnalytics + useScriptRating | molecules |
| SelectedVisualsPreview | useVisualSelections | molecules |

---

## Data Flow

```
User Action → Hook → Storage → State Update → UI Re-render
     ↓
  Persist to localStorage/IndexedDB
```

---

## Cleanup Strategy

- Oldest items auto-removed when limits reached
- User can manually clear via panel buttons
- No server sync (privacy preserved)
