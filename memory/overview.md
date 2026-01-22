# İçerik Trend Engine - Project Overview

> **Version**: 1.0.0  
> **Last Updated**: 22 Ocak 2026  
> **Status**: MVP Complete

---

## 🎯 Core Mission

Reddit tabanlı viral içerik tespit motoru. Instagram, TikTok ve YouTube Reels için güncel ve trend olan konuları tespit eder ve AI ile içerik scriptleri üretir.

---

## 🏗️ Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Backend Framework** | Hono | Lightweight, fast |
| **Runtime** | Node.js 20+ | ESM modules |
| **Database** | SQLite (better-sqlite3) | WAL mode, no external deps |
| **Frontend Framework** | React 19 | Vite bundler |
| **Styling** | Tailwind CSS | |
| **State Management** | Zustand | Client-side |
| **Data Fetching** | React Query | @tanstack/react-query |
| **AI** | Google Gemini | Content script generation |
| **Logging** | Pino | Structured JSON logs |

---

## 📦 Monorepo Structure

```
icerik/
├── apps/
│   ├── engine/          # Core backend (Hono API)
│   │   └── src/
│   │       ├── api/     # REST endpoints
│   │       ├── cache/   # SQLite caching layer
│   │       ├── worker/  # Background polling
│   │       ├── ai/      # Gemini integration
│   │       ├── ingestion/   # Reddit data fetching
│   │       ├── processing/  # NES algorithm
│   │       └── utils/   # Logger, env
│   └── dashboard/       # Web UI (React)
│       └── src/
│           ├── components/  # Atomic Design
│           ├── pages/       # TrendExplorer
│           ├── lib/         # API client, hooks
│           └── stores/      # Zustand
└── packages/
    └── shared/          # Types, constants
```

---

## 🔑 Key Algorithms

### NES (Normalized Engagement Score)
```
NES = (score × engagement_velocity × controversy_factor) / subreddit_baseline
```

- **Engagement Velocity**: Comments/time ratio
- **Controversy Factor**: High comment-to-upvote ratio
- **Subreddit Baseline**: Normalized against subreddit size

---

## 📡 API Endpoints Summary

### Core
- `GET /api/trends` - Trend list with filtering
- `GET /api/trends/summary` - Aggregated summary
- `GET /api/categories` - Available categories
- `GET /api/subreddits` - Subreddit configurations
- `GET /api/status` - Engine + cache status
- `GET /api/health` - Health check

### Cache Management
- `POST /api/cache/invalidate` - Manual cache invalidation
- `POST /api/cache/cleanup` - Clean expired entries

### Worker Management (--with-worker mode)
- `GET /api/worker/status` - Worker status
- `POST /api/worker/start` - Start polling
- `POST /api/worker/stop` - Stop polling
- `POST /api/worker/force-run/:tier` - Force immediate poll

### AI Content Generation
- `POST /api/generate-script` - Generate video script
- `GET /api/ai/status` - AI service status
- `GET /api/ai/formats/:category` - Available formats

---

## 🔧 Development Commands

```bash
# Backend development
cd apps/engine && npm run dev

# Backend with worker
cd apps/engine && npm run dev -- --with-worker

# Frontend development
cd apps/dashboard && npm run dev

# Run tests
cd apps/engine && npm test
```

---

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `REDDIT_USER_AGENT` | No | Custom UA for Reddit |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | development/production |
| `GEMINI_API_KEY` | For AI | Gemini API key |
| `LOG_LEVEL` | No | Logging level |
