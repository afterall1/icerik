# Changelog

> **Proje**: İçerik Trend Engine

Tüm önemli değişiklikler bu dosyada belgelenir.

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
