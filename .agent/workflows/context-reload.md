---
description: Yeni bir oturumda proje kontekstini tam olarak yüklemek için kullanılır
---

# Context Reload Workflow

Bu workflow, yeni bir chat oturumunda projenin tam kontekstini edinmek için adım adım takip edilir.

## Adımlar

### 1. Overview Oku
// turbo
```bash
view_file memory/overview.md
```
Projenin tech stack, yapısı ve temel API'leri hakkında bilgi edinilir.

### 2. Active Context Oku
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

### 4. API Contracts (Gerekirse)
// turbo
```bash
view_file memory/api/endpoints.md
view_file memory/api/types.md
```
API'lerle çalışılacaksa.

### 5. Architecture Docs (Gerekirse)
// turbo
```bash
view_file memory/architecture/caching.md
view_file memory/architecture/worker.md
```
Spesifik sistemlerle çalışılacaksa.

---

## Quick Start

Minimum context için:
1. `overview.md` - Proje nedir?
2. `active_context.md` - Şu an ne durumda?

Full context için tüm adımları takip et.
