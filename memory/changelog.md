# Changelog

> **Proje**: İçerik Trend Engine

Tüm önemli değişiklikler bu dosyada belgelenir.

---

## [1.9.0] - 2026-01-24

### 🧠 Native Gemini Education System (Phase 13)

NotebookLM API olmadığı için Native Gemini yaklaşımı ile Agent Education System implemente edildi.

### Added
- **Knowledge Base System** (`apps/engine/src/ai/knowledge/`)
  - `platforms/tiktok-algorithm.md` - TikTok FYP, hooks, loops (~300 lines)
  - `platforms/instagram-reels.md` - Shares, saves, aesthetics (~300 lines)
  - `platforms/youtube-shorts.md` - Retention, subscribe, SEO (~330 lines)
  - `content-patterns/viral-hooks.md` - 10 hook categories (~280 lines)
  - `content-patterns/cta-templates.md` - Platform CTAs (~270 lines)
  - `content-patterns/script-structures.md` - 8 script templates (~290 lines)

- **Knowledge Loader Module**
  - `loader.ts` - File reading, caching, section extraction (~580 lines)
  - `index.ts` - Module exports
  - `compilePlatformKnowledge()` - Platform-specific knowledge compilation

### Changed
- **BasePlatformAgent.ts** - Knowledge injection into `buildContentPrompt()`
- Every AI request now includes deep platform knowledge automatically

### Council Decision
- NotebookLM Enterprise requires corporate agreement (no public API)
- Native Gemini approach selected: Markdown files → Context injection

### Technical
- 8 new files added
- 1 file modified
- ~1800 lines of knowledge content
- ~600 lines of loader code
- TypeScript build: Passed

---

## [1.8.0] - 2026-01-24

### 🏗️ Multi-Modal Architecture & AI Quality (Phase 12)

Multi-modal agent temeli atıldı, AI script kalitesi kritik iyileştirmeler.

### Added
- **Multi-Modal Agent Architecture (Phase 1)**
  - `PlatformAlgorithmExpert` interface (`platformTypes.ts`)
  - `VisualStyle`, `AudioStyle` interface'leri
  - Platform-specific style implementations (TikTok/Reels/Shorts)

- **Supervisor Agent System**
  - `ScriptValidator.ts` - Validation rules, violations, feedback
  - `SupervisorAgent.ts` - Orchestration with retry (max 3)
  - Export modules: `validation/index.ts`, `supervisor/index.ts`

- **AI Quality Improvements**
  - `finishReason` logging for truncation detection
  - Few-shot examples for category-specific scripts
  - Warnings display in `PlatformScriptCard.tsx`

### Changed
- **Token Limit Removed** - `maxOutputTokens` parameter completely removed
- **Zero Trim Policy** - No post-generation content trimming
- TikTok `optimalDuration.max` 60 → 30 seconds (algorithm alignment)

### Fixed
- TypeScript build: Test files excluded, unused interface removed
- `VideoFormat` type import in `routes.ts`

### Technical
- 6 new files added
- 8 files modified
- ~700 lines of new code
- 48 unit tests passing

---

## [1.6.0] - 2026-01-23

### 🏗️ Infrastructure & Quality (Phase 10)

Docker containerization, E2E testing, ve UX improvements.

### Added
- **Docker Configuration**
  - `apps/engine/Dockerfile` - Multi-stage build, non-root user
  - `apps/dashboard/Dockerfile` - Nginx static serving
  - `apps/dashboard/nginx.conf` - API proxy, gzip, SPA routing
  - `docker-compose.yml` - Both services with health checks

- **E2E Tests (Playwright)**
  - `playwright.config.ts` - Multi-browser, mobile viewports
  - `e2e/dashboard.spec.ts` - 9 tests (homepage, filtering, search, URL sync)
  - Scripts: `npm run test:e2e`, `npm run test:e2e:ui`

- **Toast Notification System**
  - `Toast.tsx` - ToastProvider, useToast hook
  - 4 types: success, error, warning, info
  - Auto-dismiss, stacking (max 5)

- **Rate Limit Dashboard**
  - `RateLimitStatus.tsx` - Health indicator, progress bar
  - Auto-refresh every 10 seconds
  - Compact and full view modes

### Technical
- 9 new files added
- ~850 lines of new code
- Build size: 90.03 kB gzipped
- 14 unit tests + 9 E2E tests

---

## [1.5.0] - 2026-01-23

### 🎯 Production Polish (Phase 9)

Dashboard production-ready hale getirildi: responsive grid, URL state sync, mobile optimizations, unit tests.

### Added
- **TrendGrid.tsx** (~270 lines)
  - Responsive CSS Grid (1/2/3 columns)
  - Grid/List view toggle
  - Scroll-based lazy loading virtualization
  - Staggered fade-in animations

- **useUrlState.ts** (~220 lines)
  - Bidirectional filter ↔ URL sync
  - Browser back/forward navigation support
  - Deep linking: `/?category=technology&sort=hot`

- **Unit Tests** (14 tests)
  - `vitest.config.ts` - Test framework configuration
  - `setupTests.ts` - Browser API mocks
  - `hooks.test.tsx` - useCategories, useTrends, useScriptGenerator tests

### Changed
- **UnifiedDashboard.tsx**: TrendResults → TrendGrid, useUrlState integration
- **CategoryTabs.tsx**: iOS touch scroll (-webkit-overflow-scrolling), snap scrolling
- **TrendCard.tsx**: Always-visible button on mobile, condensed text

### Technical
- 5 new files added
- 6 files modified
- Vitest + React Testing Library
- 14 tests passed (802ms)
- Build size: 89.18 kB gzipped

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
