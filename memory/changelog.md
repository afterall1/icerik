# Changelog

> **Proje**: İçerik Trend Engine

Tüm önemli değişiklikler bu dosyada belgelenir.

---

## [1.17.0] - 2026-01-24

### 🛡️ Security Hardening (Phase 20)

360° güvenlik denetimi ve hardening. Rate limiting, input validation, CSP ve XSS koruması.

### Added
- **securityMiddleware.ts** (`apps/engine/src/api/securityMiddleware.ts`)
  - `createRateLimiter()` - IP-based sliding window rate limiting
  - `createSecurityHeaders()` - X-Frame-Options, X-XSS-Protection, etc.
  - `createErrorHandler()` - Production error sanitization
  - `createBodySizeLimit()` - 100KB request body limit

- **inputValidator.ts** (`apps/engine/src/api/inputValidator.ts`)
  - 8 Zod schemas for all API endpoints
  - `validateRequest()` middleware factory
  - `sanitizeString()`, `sanitizeUrl()` helpers

- **securityLogger.ts** (`apps/engine/src/utils/securityLogger.ts`)
  - Security event tracking (rate_limit, invalid_input, suspicious_request)
  - Pattern detection (SQL injection, XSS, path traversal)
  - `getSecurityStats()` for monitoring

- **sanitize.ts** (`apps/dashboard/src/lib/sanitize.ts`)
  - `escapeForDisplay()` - HTML entity encoding
  - `sanitizeUrl()` - Protocol validation
  - `stripHtml()` - Complete HTML stripping

### Changed
- **routes.ts** - Security middleware stack integration
- **env.ts** - Added `CORS_ORIGINS`, `API_SECRET_KEY`
- **index.html** - CSP meta tags, security headers
- **package.json** (dashboard) - Build script fix (`tsc -b` removed)

### Security Features
| Feature | Detail |
|---------|--------|
| Rate Limiting | 100/min general, 20/min AI |
| Input Validation | Zod schemas for all endpoints |
| Security Headers | X-Frame-Options, XSS Protection |
| CSP | Content Security Policy in HTML |
| Error Sanitization | No stack traces in production |
| Security Logging | Suspicious pattern detection |

### Technical
- 4 new files added
- 4 files modified
- TypeScript build verified
- Full monorepo build passed

---

## [1.16.0] - 2026-01-24

### 🔄 Observatory Auto-Update (Phase 19.1)

Observatory artık memory dosyalarından otomatik güncelleniyor.

### Added
- **memoryParser.ts** (`apps/engine/src/api/memoryParser.ts`)
  - `getRoadmapData()` - Parse `roadmap.md` → phases[]
  - `getADRData()` - Parse `decisions.md` → adrs[]
  - `getEndpointsData()` - Parse `endpoints.md` → endpoints[]
  - `getArchitectureData()` - Scan `architecture/` → systems[]
  - `getProjectMetadata()` - Extract version from `changelog.md`
  - `getFutureIdeas()` - Parse future ideas from `roadmap.md`
  - 5-minute in-memory caching for all parsers

### Changed
- **observatory.ts** - Refactored to use memoryParser instead of hardcoded data
  - `/api/observatory/metrics` → Auto-updated from memory files
  - `/api/observatory/endpoints` → Parsed from `endpoints.md`
  - `/api/observatory/architecture` → Parsed from `architecture/` + `decisions.md`
  - `/api/observatory/roadmap` → Parsed from `roadmap.md`
  - `/api/observatory/prompts` → Dynamic discovery of knowledge files

### Technical
- Zero manual updates needed after `/memory-sync`
- Added `autoUpdated: true` flag to all API responses
- 5-minute cache TTL for performance

---


## [1.15.0] - 2026-01-24

### 🔭 Project Observatory (Phase 19)

Kod bilmeden projeye tam hakimiyet sağlayan görsel gözetim paneli.

### Added
- **Observatory Backend API** (`apps/engine/src/api/observatory.ts`)
  - `GET /api/observatory/metrics` - Proje metrikleri
  - `GET /api/observatory/prompts` - AI prompt envanteri
  - `GET /api/observatory/endpoints` - API kataloğu
  - `GET /api/observatory/architecture` - Mimari dokümantasyonu
  - `GET /api/observatory/roadmap` - Faz durumları

- **OverviewPanel Component** - Metrik kartları (version, phases, endpoints)
- **PromptInventory Component** - AI prompt arama/kopyalama (6 knowledge + 4 embedded)
- **ArchitectureMap Component** - Sistem kartları + ADR tablosu
- **ApiCatalog Component** - 21 endpoint, kategorize görünüm
- **FeatureStatus Component** - 19 faz durumu + gelecek fikirler
- **HealthMetrics Component** - Real-time sistem sağlığı (30s refresh)

- **ProjectObservatory Page** (`apps/dashboard/src/pages/ProjectObservatory.tsx`)
  - Tab navigation ile 6 panel
  - Hash-based routing (`#/observatory`)

- **observatoryApi Client** (`apps/dashboard/src/lib/observatoryApi.ts`)
  - Typed API client for all observatory endpoints

### Changed
- **App.tsx** - Added QueryClientProvider and hash-based router
- **UnifiedDashboard.tsx** - Added Observatory button in header

### Technical
- 12 new files created
- 3 files modified
- TypeScript build verified (engine + dashboard)

---


## [1.14.0] - 2026-01-24

### 📊 Advanced Analytics (Phase 18)

Local-first analytics ve rating sistemi.

### Added
- **useScriptRating Hook** (`apps/dashboard/src/lib/useScriptRating.ts`)
  - IndexedDB persistence
  - Like/dislike thumbs rating
  - Optional 1-5 star rating
  - Text feedback support
  - Statistics aggregation

- **useAnalytics Hook** (`apps/dashboard/src/lib/useAnalytics.ts`)
  - localStorage event tracking
  - Copy/export/iterate event counters
  - Platform breakdown
  - Session tracking
  - Summary statistics

- **RatingPanel Component** (`apps/dashboard/src/components/molecules/RatingPanel.tsx`)
  - Thumbs up/down buttons
  - Star rating UI
  - Feedback textarea
  - Compact mode

- **AnalyticsPanel Component** (`apps/dashboard/src/components/molecules/AnalyticsPanel.tsx`)
  - Summary stat cards
  - Platform breakdown
  - Rating statistics
  - Export/reset actions

---

## [1.13.0] - 2026-01-24

### 📁 Content Management (Phase 17)

Browser-native content yönetimi.

### Added
- **useFavorites Hook** (`apps/dashboard/src/lib/useFavorites.ts`)
  - localStorage persistence
  - Max 100 favorites
  - Toggle/clear functionality

- **useScriptHistory Hook** (`apps/dashboard/src/lib/useScriptHistory.ts`)
  - IndexedDB persistence
  - Max 50 history entries
  - Script metadata storage

- **useExport Hook** (`apps/dashboard/src/lib/useExport.ts`)
  - Markdown export
  - JSON export
  - Clipboard copy

- **FavoriteButton Component** (`apps/dashboard/src/components/atoms/FavoriteButton.tsx`)
- **FavoritesPanel Component** (`apps/dashboard/src/components/molecules/FavoritesPanel.tsx`)
- **HistoryPanel Component** (`apps/dashboard/src/components/molecules/HistoryPanel.tsx`)

---

## [1.12.0] - 2026-01-24

### 🚀 Deployment & CI/CD (Phase 16)

GitHub Actions ve deployment altyapısı.

### Added
- **GitHub Actions CI Workflow** (`.github/workflows/ci.yml`)
  - Build job (shared, engine, dashboard)
  - Type-check job
  - Lint job (if configured)
  - Test job
  - pnpm caching

- **Dependabot Configuration** (`.github/dependabot.yml`)
  - Weekly dependency updates
  - Grouped by type

- **Deployment Guide** (`DEPLOYMENT.md`)
  - Docker deployment instructions
  - Environment variables
  - Health checks
  - Troubleshooting

---

## [1.11.0] - 2026-01-24

### 🧠 AI Quality Enhancement (Phase 15)

AI script kalitesini artıran modüller.

### Added
- **AIMetrics Module** (`apps/engine/src/ai/metrics/AIMetrics.ts`)
  - Operation timing tracking
  - Token usage monitoring
  - Quality score tracking
  - Knowledge cache stats

- **ExampleSelector Module** (`apps/engine/src/ai/examples/ExampleSelector.ts`)
  - Dynamic few-shot selection
  - Similarity scoring (category, NES, subreddit, keywords)

- **ScriptIterator Module** (`apps/engine/src/ai/iteration/ScriptIterator.ts`)
  - 9 iteration targets
  - Partial script regeneration
  - Tone modification

- **VariantGenerator Module** (`apps/engine/src/ai/variants/VariantGenerator.ts`)
  - 5 variant styles
  - A/B script generation
  - Auto-scoring integration

- **API Endpoints**
  - `GET /api/ai/metrics`
  - `POST /api/scripts/iterate`
  - `POST /api/generate-script-variants`

- **Dashboard UI**
  - IterationPanel component
  - Phase 15 API types & hooks

---

## [1.10.0] - 2026-01-24

### 🧠 Trend Intelligence & Viral Scoring (Phase 14)

Supreme Council değerlendirmesi sonrası P0 öneriler implemente edildi.

### Added
- **Shared Package Types** (`packages/shared/src/types.ts`)
  - `TrendType` enum (8 types: controversy, breaking_news, tutorial, story, review, discussion, meme, announcement)
  - `ContentFormat` enum (7 formats: hot_take, urgency, step_by_step, narrative_arc, comparison, reaction, entertainment)
  - `TrendClassification` interface
  - `AlgorithmScore` interface (5-dimensional viral scoring)
  - `ClassifiedTrend` interface

- **Shared Package Constants** (`packages/shared/src/constants.ts`)
  - `TREND_TYPE_FORMATS` - Format recommendations per trend type
  - `TREND_TYPE_KEYWORDS` - Detection keywords per trend type

- **TrendClassifier Module** (`apps/engine/src/ai/classification/`)
  - `TrendClassifier.ts` (~200 lines)
    - Keyword matching in title
    - Subreddit bias analysis
    - Engagement pattern analysis
    - Time-based signals (breaking news detection)
    - Confidence scoring algorithm
  - `index.ts` - Module exports

- **AlgorithmScorer Module** (`apps/engine/src/ai/scoring/`)
  - `AlgorithmScorer.ts` (~470 lines)
    - Hook Strength scoring (25% weight)
    - Completion Potential scoring (25% weight)
    - Engagement Triggers scoring (20% weight)
    - Platform Optimization scoring (15% weight)
    - Loop Potential scoring (15% weight)
    - Viral label generation (🔥 → ⚠️)
    - Improvement suggestions
  - `index.ts` - Module exports

- **API Endpoints** (`apps/engine/src/api/routes.ts`)
  - `POST /api/trends/:id/classify` - Classify trend & get format recommendation
  - `POST /api/scripts/score` - Score script for viral potential

- **Dashboard API Types** (`apps/dashboard/src/lib/api.ts`)
  - `TrendType`, `ContentFormat` types
  - `TREND_TYPE_CONFIG` constant (8 trend type color/emoji configs)
  - `TrendClassification`, `AlgorithmScore`, `ViralPotentialLabel` interfaces
  - `classificationApi` client methods

- **React Query Hooks** (`apps/dashboard/src/lib/hooks.ts`)
  - `useClassifyTrend` - Trend classification mutation
  - `useScoreScript` - Single script scoring mutation
  - `useBatchScoreScripts` - Batch scoring for parallel platforms

- **TrendTypeBadge Component** (`apps/dashboard/src/components/atoms/TrendTypeBadge.tsx`)
  - 8 trend type color-coded badges
  - Confidence display option
  - Size variants (sm/md)
  - Skeleton loader

- **AlgorithmScoreCard Component** (`apps/dashboard/src/components/molecules/AlgorithmScoreCard.tsx`)
  - Overall score circle with gradient
  - 5 metric progress bars
  - Improvement suggestions section
  - Compact mode for inline display
  - CompactScoreBadge variant

### Changed
- **TrendCard.tsx** - Added `classification` prop, renders TrendTypeBadge
- **PlatformScriptCard.tsx** - Added score display props, renders AlgorithmScoreCard
- **MultiPlatformScriptModal.tsx** - Auto-scoring after successful script generation

### Technical
- 16 files added/modified
- ~1750 lines of new code
- TypeScript build: Passed (shared, engine, dashboard)

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
