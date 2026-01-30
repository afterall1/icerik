# Roadmap

> **Proje**: İçerik Trend Engine  
> **Son Güncelleme**: 24 Ocak 2026

---

## ✅ Completed

### Phase 1: SQLite Caching Layer
- [x] better-sqlite3 integration
- [x] Cache schema (trends, subreddit_stats, request_log)
- [x] TTL-based expiration
- [x] X-Cache headers

### Phase 2: Background Polling Worker
- [x] Tier-based scheduler
- [x] Graceful shutdown
- [x] Worker management endpoints

### Phase 3: Dashboard Polish
- [x] ErrorBoundary component
- [x] Skeleton loading components
- [x] React Query integration

### Phase 4: AI Content Script Generation
- [x] Gemini API client
- [x] ScriptGenerator with prompts
- [x] Video format templates
- [x] API endpoints

### Phase 5: Dashboard AI Integration
- [x] ScriptGeneratorModal.tsx UI component
- [x] TrendCard "Generate Script" button
- [x] Script preview modal
- [x] Copy to clipboard

### Phase 6: Gemini 3 Flash Preview Upgrade
- [x] Model: `gemini-3-flash-preview` (1M input, 65K output)
- [x] ENV loading fix (`--env-file` flag)
- [x] End-to-end verification (~15s response)

### Phase 7: Unified Dashboard & NES Tooltip
- [x] UnifiedDashboard.tsx (single-page)
- [x] CategoryTabs, FilterSidebar, SearchBar
- [x] NesTooltip.tsx (educational UX)
- [x] Category filtering fix (label-to-ID mapping)

### Phase 8: Performance Optimization
- [x] Parallel Batch Fetching (CONCURRENCY_LIMIT=2)
- [x] Proactive Category Caching (Multi-Sort Warming)
- [x] ~60s → <100ms dashboard response
- [x] 20 unit tests verified

### Phase 9: Production Polish
- [x] TrendGrid.tsx component (responsive 1/2/3 columns)
- [x] URL state sync for filters (useUrlState hook)
- [x] Mobile responsive testing (iOS touch scroll)
- [x] Unit tests for hooks (14 tests passed)

### Phase 10: Infrastructure & Quality
- [x] Docker configuration (Dockerfile, docker-compose, nginx)
- [x] E2E tests with Playwright (9 tests)
- [x] Toast notification system
- [x] Rate limit dashboard component

### Phase 11: Multi-Platform Agent System
- [x] BasePlatformAgent abstract class (Template Method pattern)
- [x] TikTokAgent, ReelsAgent, ShortsAgent implementations
- [x] Platform-specific algorithm focus & hashtag strategies
- [x] POST /api/generate-multi-platform endpoint

### Phase 12: Supervisor & Orchestrator
- [x] SupervisorAgent with retries & validation
- [x] MultiPlatformOrchestrator (parallel generation)
- [x] ScriptValidator module
- [x] Dashboard MultiPlatformScriptModal.tsx

### Phase 13: Native Gemini Education System
- [x] Knowledge Base (6 markdown files per platform)
- [x] KnowledgeLoader module with caching
- [x] Platform knowledge injection in prompts
- [x] Algorithm-focused script generation

### Phase 14: Trend Intelligence & Viral Scoring
- [x] TrendClassifier module (8 trend types)
- [x] AlgorithmScorer module (5-dimensional scoring)
- [x] TrendTypeBadge, AlgorithmScoreCard components
- [x] Auto-scoring after script generation

### Phase 20: Security Hardening
- [x] securityMiddleware.ts (rate limiting, headers, error handler)
- [x] inputValidator.ts (Zod schemas for all endpoints)
- [x] securityLogger.ts (security event tracking)
- [x] sanitize.ts (frontend XSS prevention)
- [x] CSP headers in index.html
- [x] CORS configuration hardening
- [x] Environment variables (CORS_ORIGINS, API_SECRET_KEY)

### Phase 21: Image Discovery System
- [x] PexelsClient.ts (Pexels API wrapper)
- [x] ImageValidator.ts (Gemini Vision text detection)
- [x] KeywordExtractor.ts (content-based keyword extraction)
- [x] ImageSearchService.ts (orchestration + caching)
- [x] 5 API endpoints (/api/images/*)
- [x] ImageCard.tsx (validation badge, actions)
- [x] ImageSuggestionsPanel.tsx (search + grid)
- [x] MultiPlatformScriptModal "Görseller" tab

### Phase 22: Visual Search Specialist AI Agent
- [x] VisualSearchSpecialist.ts (AI-powered search query generation)
- [x] Gemini API integration with multi-step reasoning
- [x] Soyut→Somut visual mapping
- [x] Section-aware mood selection (Hook/Body/CTA)
- [x] Portrait orientation default (9:16)
- [x] Fallback to KeywordExtractor

### Phase 23: Visual Selection System
- [x] selectedVisualsTypes.ts (types + utilities)
- [x] useVisualSelections.ts (IndexedDB hook)
- [x] SelectedVisualsPreview.tsx (section preview component)
- [x] VisualCard.tsx selection overlay + order badge
- [x] VisualDiscoveryPanel.tsx selection state props
- [x] PlatformScriptCard.tsx integration
- [x] Max 2 visuals per section limit

### Phase 24: Voice Generation System ✅
- [x] VoiceService.ts (ElevenLabs + Fish Audio multi-provider)
- [x] VoiceCache.ts (SQLite cache, 7-day preview TTL)
- [x] Voice API endpoints (4 endpoints: generate, status, preview, cache clear)
- [x] voiceTypes.ts (frontend types + utilities)
- [x] useVoiceSelection.ts (IndexedDB persistence)
- [x] VoiceSelectionModal.tsx (voice picker UI)
- [x] VoicePreviewCard.tsx (audio preview with cache retry)
- [x] CSP media-src configuration (data: blob:)
- [x] BroadcastChannel sync for voice selection

### Phase 25: TTS Visual Direction Cleanup ✅
- [x] scriptSanitizer.ts (backend text sanitization)
- [x] textSanitizer.ts (frontend TTS sanitization)
- [x] Bracket annotation removal ([ZOOM IN], [TEXT: ...], etc.)
- [x] ScriptGenerator prompt update (forbid visual directions)
- [x] Source-level cleanup in parseResponse()

### Phase 26: Video Editing Agent ✅
- [x] types.ts (platform profiles, caption styles)
- [x] TimelineBuilder.ts (script → timeline, Ken Burns)
- [x] CaptionGenerator.ts (word-by-word 15-20 CPS)
- [x] AudioMixer.ts (ducking, normalization)
- [x] FFmpegComposer.ts (FFmpeg filter complex)
- [x] VideoEditingAgent.ts (main orchestrator)
- [x] 4 Video API endpoints (generate, status, jobs, cleanup)
- [x] Platform profiles: TikTok, Reels, Shorts

### Phase 27: E2E Testing Infrastructure ✅
- [x] video-generation.spec.ts (280 satır, video akışı E2E)
- [x] voice-generation.spec.ts (240 satır, ses testleri)
- [x] test-helpers.ts (API mock, wait helpers)
- [x] e2e-tests.yml (GitHub Actions CI/CD)
- [x] video-e2e-test SKILL.md (Antigravity skill)
- [x] CSP Blob URL fix (audioBlob → FileReader)
- [x] useVideoJobs infinite loop fix (refs)

---

## 🟡 In Progress


### Phase 15: AI Quality Enhancement ✅

**Backend** ✅:
- [x] AIMetrics module (observability)
- [x] ExampleSelector module (dynamic few-shot)
- [x] ScriptIterator module (partial regeneration)
- [x] VariantGenerator module (A/B variants)
- [x] 3 new API endpoints

**Dashboard UI** ✅:
- [x] Phase 15 API types & clients
- [x] React Query hooks (iterate, variants, metrics)
- [x] IterationPanel component
- [x] PlatformScriptCard iteration integration
- [x] showIterationPanel enabled in modal

### Phase 16: Deployment & CI/CD ✅

**CI/CD** ✅:
- [x] GitHub Actions workflow (build, lint, test)
- [x] Dependabot configuration

**Local Storage** ✅:
- [x] useFavorites hook (localStorage)
- [x] useScriptHistory hook (IndexedDB)
- [x] FavoriteButton component

**Deployment** ✅:
- [x] DEPLOYMENT.md guide
- [x] Docker Compose (existing)

### Phase 19: Project Observatory ✅

**Backend API** ✅:
- [x] `/api/observatory/metrics` - Proje metrikleri
- [x] `/api/observatory/prompts` - AI prompt envanteri
- [x] `/api/observatory/endpoints` - API kataloğu
- [x] `/api/observatory/architecture` - Mimari dokümantasyonu
- [x] `/api/observatory/roadmap` - Faz durumları

**Frontend Panels** ✅:
- [x] OverviewPanel (metrik kartları)
- [x] PromptInventory (AI prompt arama/kopyalama)
- [x] ArchitectureMap (sistem + ADR)
- [x] ApiCatalog (endpoint listesi)
- [x] FeatureStatus (roadmap progress)
- [x] HealthMetrics (real-time sağlık)

**Integration** ✅:
- [x] Hash-based routing (#/observatory)
- [x] Dashboard header link
- [x] QueryClientProvider wrapper

---

## 📋 Completed Backlog

> All planned phases (1-19) have been completed. Items below moved from backlog to completed.

### Phase 17: Content Management ✅

**Hooks** ✅:
- [x] useFavorites (localStorage persistence)
- [x] useScriptHistory (IndexedDB persistence)
- [x] useExport (MD/JSON download)

**Components** ✅:
- [x] FavoriteButton atom
- [x] FavoritesPanel molecule
- [x] HistoryPanel molecule

### Phase 18: Advanced Analytics ✅

**Hooks** ✅:
- [x] useScriptRating (IndexedDB rating storage)
- [x] useAnalytics (localStorage event tracking)

**Components** ✅:
- [x] RatingPanel molecule (thumbs, stars, feedback)
- [x] AnalyticsPanel molecule (dashboard stats)

---

## 🔮 Future Ideas

- ML-based NES optimization (learn from user feedback)
- Real-time trending alerts (WebSocket)
- Content performance tracking
- Team collaboration features
- Multi-platform API integration (X/Twitter, TikTok API)

