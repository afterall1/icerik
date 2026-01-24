# Architecture Decision Records (ADR)

> **Proje**: İçerik Trend Engine  
> **Son Güncelleme**: 22 Ocak 2026

Bu dosya, projenin kritik mimari kararlarını kaydeder. Her ADR bir tasarım seçiminin kontekstini, kararı ve sonuçlarını belgeler.

---

## ADR-001: SQLite over Redis for MVP Caching

**Status**: ✅ Accepted  
**Date**: 2026-01-22

### Context
MVP için caching layer gerekiyordu. Redis (production-grade) vs SQLite (embedded) seçimi yapılmalıydı.

### Decision
SQLite ile `better-sqlite3` kütüphanesi seçildi.

### Rationale
1. **Zero External Dependencies**: Redis server kurulumu gereksiz
2. **Single File Deployment**: Database tek dosyada (`data/cache.db`)
3. **Synchronous API**: `better-sqlite3` senkron çalışır, async overhead yok
4. **WAL Mode**: Concurrent read performansı
5. **Migration Path**: Production'da Redis'e geçiş kolay

### Consequences
- ✅ Hızlı MVP development
- ✅ Kolay deployment
- ⚠️ Distributed cache için uygun değil (tek instance)
- ⚠️ Very high write throughput için performance limit

---

## ADR-002: .json Endpoint for Reddit API

**Status**: ✅ Accepted  
**Date**: 2026-01-22

### Context
Reddit verisi çekmek için OAuth API vs public `.json` endpoint seçimi.

### Decision
Public `.json` endpoint tercih edildi (örn: `reddit.com/r/technology.json`).

### Rationale
1. **No API Key Required**: OAuth flow gereksiz
2. **Simpler Implementation**: Doğrudan fetch
3. **Rate Limit Awareness**: Exponential backoff ile yönetilebilir

### Consequences
- ✅ Hızlı implementation
- ⚠️ Rate limiting riskleri (429 errors)
- ⚠️ OAuth'a göre daha düşük limit

---

## ADR-003: NES Algorithm for Trend Scoring

**Status**: ✅ Accepted  
**Date**: 2026-01-22

### Context
Farklı subreddit'lerdeki postları karşılaştırılabilir bir metrik ile değerlendirmek gerekiyordu.

### Decision
Normalized Engagement Score (NES) algoritması tasarlandı:
```
NES = (score × engagement_velocity × controversy_factor) / subreddit_baseline
```

### Rationale
1. **Size Normalization**: Küçük subreddit'lerdeki yüksek engagement büyük olanlara göre ağırlıklandırılır
2. **Time Decay**: Yeni postlar daha fazla ağırlık alır
3. **Controversy Boost**: Yüksek comment/upvote oranı viral potansiyel göstergesi

### Consequences
- ✅ Cross-subreddit comparison
- ✅ Viral potential prediction
- ⚠️ Baseline accuracy subreddit stats'a bağlı

---

## ADR-004: Tier-Based Polling for Background Worker

**Status**: ✅ Accepted  
**Date**: 2026-01-22

### Context
40+ subreddit'i düzenli poll etmek için optimal strateji gerekiyordu.

### Decision
3-tier polling sistemi:
- **Tier 1**: 5 dakika (yüksek hacimli subredditler)
- **Tier 2**: 15 dakika (orta hacimli)
- **Tier 3**: 30 dakika (düşük hacimli)

### Rationale
1. **API Efficiency**: Rate limit'i verimli kullanır
2. **Priority-Based**: Önemli subreddit'ler daha sık poll edilir
3. **Configurable**: `SUBREDDIT_CONFIG` içinde ayarlanabilir

### Consequences
- ✅ Rate limit optimization
- ✅ Fresh data for high-volume sources
- ⚠️ Low-tier subreddit'lerde delayed trends

---

## ADR-005: Dynamic AI Module Import

**Status**: ✅ Accepted  
**Date**: 2026-01-22

### Context
AI modülü (Gemini) opsiyonel. Her API request'te yüklenmemeli.

### Decision
`routes.ts` içinde dynamic `import()` kullanıldı:
```typescript
const { getGeminiClient } = await import('../ai/index.js');
```

### Rationale
1. **Lazy Loading**: AI modülü sadece `/api/generate-script` çağrıldığında yüklenir
2. **No Startup Cost**: Server başlatma zamanını etkilemez
3. **Optional Feature**: `GEMINI_API_KEY` olmadan çalışabilir

### Consequences
- ✅ Faster server startup
- ✅ Optional AI feature
- ⚠️ Slight latency on first AI request

---

## ADR-006: Atomic Design for Dashboard Components

**Status**: ✅ Accepted  
**Date**: 2026-01-22

### Context
Dashboard component organizasyonu için pattern gerekiyordu.

### Decision
Atomic Design pattern: `atoms/`, `molecules/`, `organisms/`

### Rationale
1. **Reusability**: Küçük parçalar büyük bileşenlerde kullanılır
2. **Testability**: Her seviye bağımsız test edilebilir
3. **Consistency**: UI dili tutarlı kalır

### Consequences
- ✅ Clear component hierarchy
- ✅ Easy to extend
- ⚠️ Initial setup overhead

---

## ADR-020: Local-First Analytics (No Auth)

**Status**: ✅ Accepted  
**Date**: 2026-01-24  
**Phase**: 18

### Context
Analytics ve rating sistemi için backend authentication vs local storage seçimi.

### Decision
IndexedDB ve localStorage ile tamamen client-side analytics.

### Rationale
1. **Zero Backend Complexity**: Auth, database, API gereksiz
2. **Privacy First**: Kullanıcı verisi server'a gönderilmiyor
3. **Instant Availability**: Network latency yok
4. **Export Option**: Kullanıcı isterse JSON export edebilir

### Consequences
- ✅ Fast implementation
- ✅ No server costs
- ⚠️ Data not synced across devices
- ⚠️ Lost if browser data cleared

---

## ADR-021: IndexedDB for Complex Data

**Status**: ✅ Accepted  
**Date**: 2026-01-24  
**Phase**: 17-18

### Context
Script history ve ratings için localStorage vs IndexedDB seçimi.

### Decision
- **localStorage**: Simple key-value (favorites, analytics counters)
- **IndexedDB**: Complex objects with indexes (scripts, ratings)

### Rationale
1. **Size Limits**: localStorage ~5MB, IndexedDB ~50MB+
2. **Indexing**: IndexedDB supports secondary indexes
3. **Async API**: Non-blocking for large data

### Consequences
- ✅ Scalable storage
- ✅ Fast queries by index
- ⚠️ More complex API

---

## ADR-022: GitHub Actions CI/CD

**Status**: ✅ Accepted  
**Date**: 2026-01-24  
**Phase**: 16

### Context
CI/CD pipeline seçimi: GitHub Actions vs Jenkins vs CircleCI.

### Decision
GitHub Actions with pnpm monorepo support.

### Rationale
1. **Native Integration**: GitHub repo ile entegre
2. **Free Tier**: Public repos için ücretsiz
3. **pnpm Support**: First-class pnpm action
4. **Matrix Builds**: Multiple Node versions test edilebilir

### Consequences
- ✅ Quick setup
- ✅ No external service
- ⚠️ GitHub lock-in

---

## ADR-023: Generic Type Bridge Pattern

**Status**: ✅ Accepted  
**Date**: 2026-01-24  
**Phase**: 15

### Context
Circular dependency between `types.ts` and `platformTypes.ts` for variant/iteration types.

### Decision
- Generic types in `types.ts`: `ScriptVariant<TScript = unknown>`
- Concrete aliases in `platformTypes.ts`: `type PlatformScriptVariant = ScriptVariant<PlatformScript>`

### Rationale
1. **Avoids Circular Import**: types.ts doesn't import platformTypes.ts
2. **Type Safety**: Full typing preserved at usage site
3. **Extensibility**: New script types can use same generics

### Consequences
- ✅ Clean separation
- ✅ No runtime overhead
- ⚠️ Slightly more verbose type usage

---

*New ADRs should be added chronologically with incrementing numbers.*

