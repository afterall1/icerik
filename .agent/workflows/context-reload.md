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

#### 5.3 Frontend Storage
// turbo
```bash
view_file memory/architecture/local-storage.md
```
Browser-native storage hooks (favorites, history, analytics).

---

## Task-Based Loading Guide

| Çalışma Tipi | Yüklenecek Dosyalar |
|--------------|---------------------|
| **API Development** | overview + active_context + endpoints + types |
| **AI/Script Work** | + multi-agent + knowledge-system + ai-quality |
| **Frontend Work** | + local-storage |
| **Performance** | + caching + worker |
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

## Architecture Files Summary

| Dosya | Açıklama | Phase |
|-------|----------|-------|
| `caching.md` | SQLite cache layer, TTL, hit tracking | 1 |
| `worker.md` | Tier-based background polling | 2 |
| `multi-agent.md` | Platform agents (TikTok/Reels/Shorts) | 11-12 |
| `knowledge-system.md` | Native Gemini education system | 13 |
| `ai-quality.md` | AIMetrics, Iterator, Variants | 15 |
| `local-storage.md` | Browser storage hooks | 16-18 |
