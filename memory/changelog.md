# Changelog

> **Proje**: İçerik Trend Engine

Tüm önemli değişiklikler bu dosyada belgelenir.

---

## [1.4.0] - 2026-01-23

### ⚡ Category Loading Performance Optimization (Phase 8)

Dashboard category seçimi ~60 saniyeden <100ms'e indirildi.

### Added
- **Parallel Batch Fetching** (`redditFetcher.ts`)
  - `CONCURRENCY_LIMIT = 2` ile kontrollü paralel fetch
  - `Promise.allSettled` ile hata izolasyonu
  - Circuit breaker: 429 Rate Limit algılama
  
- **Proactive Category Caching** (`worker.ts`)
  - Multi-Sort Warming: `nes`, `score`, `comments` pre-cache
  - Background worker kategori bazlı pre-compute
  - Deterministic cache key alignment

### Performance Results
| Senaryo | Eski | Yeni | İyileşme |
|---------|------|------|----------|
| Cold Category Load | ~60s | ~30s | -50% |
| Cached Category Select | ~60s | <10ms | **Instant** |
| Sort Change (Same Cat) | ~60s | <10ms | **Instant** |
| Initial Page Load | ~60-90s | <100ms | **Proactive** |

### Verified
- 20 unit test (Vitest) passed
- Live API `/api/trends?category=technology` cache HIT <1ms

---

## [1.3.0] - 2026-01-23

### 🎯 Unified Dashboard & NES Educational UX

TrendExplorer 3-step wizard yerine Unified Single-Page Dashboard, NES tooltip eğitici içerikle.

### Added
- **UnifiedDashboard.tsx** (~250 lines)
  - CategoryTabs: Horizontal scrollable category tabs
  - FilterSidebar: Collapsible filter sections
  - SearchBar: Debounced global search
  - Stats bar: Trend count, average NES, hot trends

- **NesTooltip.tsx** (~450 lines) - Educational
  - Expandable accordion sections
  - Hız Faktörü: Formula + contextual explanation
  - Tartışma Faktörü: Bonus/penalty thresholds
  - Subreddit Baseline: Per-subreddit values with subscriber counts
  - Final calculation breakdown

- **Category Filtering Fix**
  - Backend label-to-ID mapping (accepts both "Teknoloji" and "technology")

### Changed
- App.tsx: TrendExplorer → UnifiedDashboard
- TrendCard.tsx: Wrapped NES badge with NesTooltip
- TrendResults.tsx: Passes engagementVelocity, controversyFactor props

### Technical
- 5 new files added
- 4 files modified
- ~1000 lines of new code

---

## [1.2.0] - 2026-01-23

### 🤖 Gemini 3 Flash Preview Entegrasyonu

AI script generation artık Gemini 3 Flash Preview modeli kullanıyor.

### Changed
- **Model Upgrade**: `gemini-2.0-flash` → `gemini-3-flash-preview`
  - 1M input tokens, 65K output tokens
  - Thinking ve structured outputs desteği
- **ENV Loading Fix**: `--env-file=../../.env` flag eklendi
  - Node.js 20+ gereksinimi

### Fixed
- `.env` dosyası artık doğru yükleniyor (dotenv yerine native Node.js flag)
- Gemini API 404 hatası düzeltildi (model versiyonu güncellendi)

### Verified
- End-to-end script generation test edildi
- Response time: ~15 saniye
- Output quality: Hook/Body/CTA yapılandırılmış

---

## [1.1.0] - 2026-01-22

### 🎨 ScriptGenerator UI & React Query Migration

Dashboard'a AI script generation UI ve React Query migration eklendi.

### Added
- **ScriptGeneratorModal.tsx** (~380 lines)
  - Format, platform, ton, dil seçimi
  - Süre slider (15-180 saniye)
  - Hook ve CTA toggle'ları
  - Script preview with sections
  - Copy to clipboard

- **ScriptPreview.tsx** - Collapsible sections, per-section copy
- **TrendCard Script Button** - "Script Oluştur" hover button
- **React Query Hooks** - useScriptGenerator, useVideoFormats, useAIStatus
- **Mobile Responsive Utilities** - touch-target, safe-area, modal-mobile-fullscreen

### Changed
- TrendExplorer refactored to use React Query hooks
- Removed ~50 lines of useState/useEffect boilerplate
- Added mobile touch targets (44px minimum)

### Technical
- 6 new files added
- 4 files modified
- ~800 lines of new code

---

## [1.0.0] - 2026-01-22

### 🎉 MVP Release

İlk production-ready release. 4 fazlı geliştirme tamamlandı.

### Added
- **SQLite Caching Layer**
  - `better-sqlite3` with WAL mode
  - TTL-based cache (5 min trends, 10 min summary)
  - X-Cache headers (HIT/MISS/BYPASS)
  - Cache management endpoints

- **Background Polling Worker**
  - Tier-based scheduler (5/15/30 min)
  - Graceful shutdown handling
  - `--with-worker` startup flag
  - Worker management API

- **Dashboard Components**
  - ErrorBoundary with Turkish UI
  - Skeleton loading variants
  - React Query integration
  - Shimmer animations

- **AI Content Generation**
  - Gemini API client with rate limiting
  - ScriptGenerator with category prompts
  - Video format templates (13 formats)
  - POST /api/generate-script endpoint

### Changed
- Replaced unused `redis` and `pg` dependencies with `better-sqlite3`
- Updated .env.example with GEMINI_API_KEY

### Technical
- 15 new files added
- 8 files modified
- ~3000 lines of new code

---

## [0.1.0] - 2026-01-22 (Initial)

### Added
- Monorepo structure (apps/engine, apps/dashboard, packages/shared)
- Reddit data fetching via .json endpoints
- NES algorithm implementation
- Basic Hono REST API
- React 19 dashboard with Zustand
- 43 subreddit configurations
