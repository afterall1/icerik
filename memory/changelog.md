# Changelog

> **Proje**: İçerik Trend Engine

Tüm önemli değişiklikler bu dosyada belgelenir.

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
