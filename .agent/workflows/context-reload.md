---
description: Yeni bir oturumda proje kontekstini tam olarak yüklemek için kullanılır
---

# Context Reload Workflow

Bu workflow, yeni bir chat oturumunda projenin tam kontekstini edinmek için adım adım takip edilir.

---

## Adımlar

### 1. Overview Oku (ZORUNLU)
// turbo
```bash
view_file memory/overview.md
```
Projenin tech stack, yapısı ve temel API'leri hakkında bilgi edinilir.

### 2. Active Context Oku (ZORUNLU)
// turbo
```bash
view_file memory/active_context.md
```
Son oturumda ne yapıldığını, incomplete features'ları ve next priorities'i öğrenilir.

### 3. ADR'leri Oku (Gerekirse)
// turbo
```bash
view_file memory/adr/decisions.md
```
Kritik mimari kararların gerekçelerini anlamak için.

### 4. API Contracts (API çalışması için)
// turbo
```bash
view_file memory/api/endpoints.md
view_file memory/api/types.md
```
REST endpoint'ler ve TypeScript type'ları.

### 5. Architecture Docs (Sistem çalışması için)

#### 5.1 Backend Core
// turbo
```bash
view_file memory/architecture/caching.md
view_file memory/architecture/worker.md
```
SQLite cache layer ve background polling sistemi.

#### 5.2 AI System
// turbo
```bash
view_file memory/architecture/multi-agent.md
view_file memory/architecture/knowledge-system.md
view_file memory/architecture/ai-quality.md
```
Multi-platform agent sistemi, Gemini education ve AI quality modülleri.

#### 5.3 Security (Güvenlik çalışması için)
// turbo
```bash
view_file memory/architecture/security.md
```
Rate limiting, input validation, CSP, XSS prevention.

#### 5.4 Frontend Storage
// turbo
```bash
view_file memory/architecture/local-storage.md
```
Browser-native storage hooks (favorites, history, analytics).

#### 5.5 Voice/TTS System
// turbo
```bash
view_file memory/architecture/voice-system.md
```
Multi-provider TTS, voice cache, BroadcastChannel sync.

#### 5.6 Video Editing System
// turbo
```bash
view_file memory/architecture/video-editing.md
```
FFmpeg pipeline, Ken Burns effects, word-by-word captions, platform profiles.

#### 5.7 E2E Testing System
// turbo
```bash
view_file memory/architecture/e2e-testing.md
```
Playwright E2E tests, Vitest unit tests, CI/CD pipeline, Antigravity skills, test patterns.

---

## Task-Based Loading Guide

| Çalışma Tipi | Yüklenecek Dosyalar |
|--------------|---------------------|
| **API Development** | overview + active_context + endpoints + types |
| **AI/Script Work** | + multi-agent + knowledge-system + ai-quality |
| **Frontend Work** | + local-storage |
| **Performance** | + caching + worker |
| **Security Work** | + security |
| **Voice/TTS Work** | + voice-system |
| **Video Editing Work** | + video-editing |
| **Testing/QA Work** | + e2e-testing |
| **Full Context** | Tüm dosyalar |

---

## Quick Start Seviyeleri

### Minimal (Hızlı başlangıç)
```
1. overview.md     → Proje nedir?
2. active_context.md → Şu an ne durumda?
```

### Standard (Çoğu görev için)
```
1. overview.md
2. active_context.md
3. adr/decisions.md
4. api/endpoints.md + types.md
```

### Full (Derin çalışma için)
```
Tüm adımları takip et (1-5 arası)
```

---

## Architecture Files Summary (10 Dosya)

| Dosya | Açıklama | Phase |
|-------|----------|-------|
| `caching.md` | SQLite cache layer, TTL, hit tracking | 1 |
| `worker.md` | Tier-based background polling | 2 |
| `multi-agent.md` | Platform agents (TikTok/Reels/Shorts) | 11-12 |
| `knowledge-system.md` | Native Gemini education system | 13 |
| `ai-quality.md` | AIMetrics, Iterator, Variants | 15 |
| `local-storage.md` | Browser storage hooks | 16-18 |
| `security.md` | Rate limiting, validation, CSP, XSS | 20 |
| `voice-system.md` | TTS providers, voice cache, sync | 24 |
| `video-editing.md` | FFmpeg pipeline, Ken Burns, captions | 26 |
| `e2e-testing.md` | Playwright, Vitest, CI/CD, Skills | 27 |

---

## ⚠️ Environment Configuration (CRITICAL)

Production modda `.env` dosyası otomatik yüklenmez! Node.js native `--env-file` kullanılmalı:

```json
// apps/engine/package.json
{
  "scripts": {
    "dev": "tsx watch --env-file=.env --env-file=../../.env src/index.ts",
    "start": "node --env-file=.env --env-file=../../.env dist/index.js"
  }
}
```

**Cascade Loading**: Local `.env` → Root `../../.env` (later overrides earlier)

### Startup Validation

Server başlangıcında feature availability loglanır:
```
✅ Gemini AI configured
✅ TTS providers configured { providers: ['ElevenLabs'] }
✅ Pexels Image API configured
```

---

## 🧪 Test Commands Quick Reference

```bash
# E2E Tests
cd apps/dashboard && npx playwright test
npx playwright test video-generation  # Specific file
npx playwright test --ui               # GUI mode

# Unit Tests
cd apps/engine && npm test
cd apps/dashboard && npm test
```
