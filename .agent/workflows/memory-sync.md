---
description: Oturum sonunda memory dosyalarını güncellemek ve context drift'i önlemek için kullanılır
---

# Memory Sync Workflow

Bu workflow, her oturum sonunda çalıştırılarak context kaybını önler.

## Adımlar

### 1. Checklist'i Aç
// turbo
```bash
view_file memory/_SYNC_CHECKLIST.md
```
Hangi dosyaların güncellenmesi gerektiğini belirle.

### 2. Active Context Güncelle

`memory/active_context.md` dosyasını güncelleyerek:
- ✅ Son Tamamlanan İşler'e bugün yapılanları ekle
- 🚧 Incomplete Features'ı güncelle
- 📅 Next Session Priorities'i belirle
- 📁 Docs to Update listesini güncelle

### 3. Kod Değişikliklerine Göre Güncelle

| Değişiklik | Güncellenecek Dosya |
|------------|---------------------|
| Yeni API endpoint | `memory/api/endpoints.md` |
| Type değişikliği | `memory/api/types.md` |
| Yeni mimari pattern | `memory/architecture/` |
| ADR gerektiren karar | `memory/adr/decisions.md` |
| Feature tamamlandı | `memory/roadmap.md` |
| Version bump | `memory/changelog.md` |

### 4. Git Commit
```bash
git add memory/
git commit -m "chore: memory sync - $(date +%Y-%m-%d)"
```

---

## Ne Zaman Çalıştırılmalı?

1. ✅ Her oturum sonunda
2. ✅ Major feature tamamlandığında
3. ✅ Kritik mimari karar alındığında
4. ✅ Bug fix'ten sonra
