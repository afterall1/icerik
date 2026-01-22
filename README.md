# İçerik Trend Engine

Reddit tabanlı viral içerik tespit engine'i. Instagram, TikTok ve YouTube Reels için güncel ve trend olan konuları tespit eder.

## 🚀 Özellikler

- **Reddit Integration**: 40+ subreddit'ten gerçek zamanlı veri çekme
- **NES Algoritması**: Normalize Engagement Score ile viral potansiyel hesaplama
- **Kategori Bazlı Filtreleme**: Teknoloji, Finans, Eğlence, Gaming, Drama ve daha fazlası
- **Rate Limiting**: Reddit API uyumlu exponential backoff
- **REST API**: Kolay entegrasyon için JSON API

## 📦 Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Ortam değişkenlerini ayarla
cp .env.example .env
# .env dosyasını düzenle

# Geliştirme modunda çalıştır
npm run dev
```

## 🔑 Reddit API Ayarları

1. [Reddit Apps](https://www.reddit.com/prefs/apps) sayfasına git
2. "Create App" butonuna tıkla
3. "script" tipini seç
4. Client ID ve Secret'ı `.env` dosyasına ekle

## 📡 API Endpoints

| Endpoint | Açıklama |
|----------|----------|
| `GET /api/trends` | Trend listesi (filtreleme destekli) |
| `GET /api/trends/summary` | Trend özeti ve kategori dağılımı |
| `GET /api/categories` | Mevcut kategoriler |
| `GET /api/status` | Engine durumu ve rate limit bilgisi |
| `GET /api/health` | Health check |

### Query Parametreleri

```
GET /api/trends?category=technology&timeRange=day&limit=20&sortBy=nes
```

- `category`: Kategori filtresi (technology, finance, entertainment, gaming, lifestyle, news, drama, sports, science)
- `timeRange`: Zaman aralığı (hour, day, week, month)
- `limit`: Maksimum sonuç sayısı
- `minScore`: Minimum Reddit skoru
- `sortBy`: Sıralama kriteri (nes, score, velocity, comments)

## 🧠 NES Algoritması

Normalized Engagement Score (NES), her post için viral potansiyeli hesaplar:

```
NES = (score × engagement_velocity × controversy_factor) / subreddit_baseline
```

- **Engagement Velocity**: Birim zamandaki etkileşim hızı
- **Controversy Factor**: Tartışmalı içerikler için çarpan
- **Subreddit Baseline**: Subreddit boyutuna göre normalizasyon

## 📁 Proje Yapısı

```
icerik/
├── apps/
│   ├── engine/          # Core trend detection engine
│   │   └── src/
│   │       ├── api/     # REST API endpoints
│   │       ├── ingestion/   # Reddit data fetching
│   │       ├── processing/  # NES calculation & aggregation
│   │       └── utils/   # Logger, env config
│   └── dashboard/       # Web UI (gelecek faz)
└── packages/
    └── shared/          # Shared types & constants
```

## 🛠️ Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **Framework**: Hono (fast & lightweight)
- **Validation**: Zod
- **Logging**: Pino

## 📄 Lisans

MIT
