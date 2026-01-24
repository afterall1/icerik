---
description: Oturum sonunda memory dosyalarını güncellemek ve context drift'i önlemek için kullanılır
---

# Memory Sync Workflow

Bu workflow, her oturum sonunda çalıştırılarak context kaybını önler.

---

## Adımlar

### 1. Checklist'i Aç
// turbo
```bash
view_file memory/_SYNC_CHECKLIST.md
```
Hangi dosyaların güncellenmesi gerektiğini ve Documentation Health Score'u kontrol et.

### 2. Active Context Güncelle

`memory/active_context.md` dosyasını güncelleyerek:
- ✅ Son Tamamlanan İşler'e bugün yapılanları ekle
- 🚧 Incomplete Features'ı güncelle
- 📅 Next Session Priorities'i belirle
- 📁 Docs to Update listesini güncelle

### 3. Kod Değişikliklerine Göre Güncelle

#### 3.1 API & Types

| Değişiklik | Güncellenecek Dosya |
|------------|---------------------|
| Yeni API endpoint | `memory/api/endpoints.md` |
| Type değişikliği | `memory/api/types.md` |

#### 3.2 Architecture (Sistem Bazlı)

| Sistem Değişikliği | Güncellenecek Dosya |
|--------------------|---------------------|
| Cache/Database | `memory/architecture/caching.md` |
| Background jobs | `memory/architecture/worker.md` |
| Platform agents | `memory/architecture/multi-agent.md` |
| AI knowledge/education | `memory/architecture/knowledge-system.md` |
| AI quality modules | `memory/architecture/ai-quality.md` |
| Browser storage hooks | `memory/architecture/local-storage.md` |

#### 3.3 Project State

| Değişiklik | Güncellenecek Dosya |
|------------|---------------------|
| ADR gerektiren karar | `memory/adr/decisions.md` |
| Feature tamamlandı | `memory/roadmap.md` |
| Version bump | `memory/changelog.md` |
| Proje yapısı değişti | `memory/overview.md` |

### 4. Verification Checklist

Sync öncesi kontrol et:
- [ ] TypeScript build geçiyor mu?
- [ ] Yeni endpoint'ler `endpoints.md`'de var mı?
- [ ] Yeni type'lar `types.md`'de var mı?
- [ ] Mimari değişiklikler ilgili dosyada dokümante mi?
- [ ] ADR numarası sıralı mı?

### 5. Git Commit

**PowerShell (Windows):**
```powershell
git add memory/
git commit -m "chore: memory sync - $(Get-Date -Format 'yyyy-MM-dd')"
git push
```

**Bash (Linux/Mac):**
```bash
git add memory/
git commit -m "chore: memory sync - $(date +%Y-%m-%d)"
git push
```

---

## Documentation Health Score

Sync sonrasında `_SYNC_CHECKLIST.md` içindeki Documentation Health Score'u kontrol et:

| Kategori | Hedef |
|----------|-------|
| API Endpoints | 100% |
| Type Documentation | 100% |
| Architecture Docs | 100% |
| Overall | 100% |

Score %100 altındaysa eksik dokümantasyonu tamamla.

---

## Ne Zaman Çalıştırılmalı?

| Durum | Zorunluluk |
|-------|------------|
| Her oturum sonunda | ✅ ZORUNLU |
| Major feature tamamlandığında | ✅ ZORUNLU |
| Kritik mimari karar alındığında | ✅ ZORUNLU |
| Bug fix'ten sonra | 🔶 Önerilir |
| Küçük refactor | ⚪ Opsiyonel |

---

## Quick Reference: Architecture Files

```
memory/architecture/
├── caching.md           # SQLite cache layer
├── worker.md            # Background polling
├── multi-agent.md       # TikTok/Reels/Shorts agents
├── knowledge-system.md  # Gemini education
├── ai-quality.md        # AIMetrics, Iterator, Variants
└── local-storage.md     # Browser storage hooks
```
