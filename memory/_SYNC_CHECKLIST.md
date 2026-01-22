# 🔄 End-of-Session Sync Checklist

> **Proje**: İçerik Trend Engine  
> **Son Sync**: 22 Ocak 2026

Bu checklist, her oturum sonunda context kaybını önlemek için ZORUNLU olarak doldurulmalıdır.

---

## 1. Kod Değişiklikleri → Dokümantasyon Güncellemeleri

- [ ] Store/State değişti mi? → `api/store_contracts.md` güncelle
- [ ] Yeni API endpoint eklendi mi? → `api/endpoints.md` güncelle
- [ ] Shared types değişti mi? → `api/types.md` güncelle
- [ ] Yeni pattern/mimari eklendi mi? → `architecture/` güncelle
- [ ] Feature logic değişti mi? → `implementation/` güncelle

## 2. Bütünlük Kontrolü

- [ ] API dokümantasyonu gerçek kodu yansıtıyor mu?
- [ ] Kritik kararlar ADR olarak kaydedildi mi?
- [ ] `active_context.md` YENİ bir asistan için yeterince detaylı mı?

## 3. Doğrulama

- [ ] Test sonuçları kaydedildi mi?
- [ ] Changelog güncellendi mi?
- [ ] Roadmap güncellendi mi?

---

## Quick Commands

```bash
# Memory sync workflow
# 1. active_context.md güncelle
# 2. Bu checklist'i doldur
# 3. git commit -m "chore: memory sync - [date]"
```
