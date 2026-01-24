# Deployment Guide

> **Project**: İçerik Trend Engine  
> **Last Updated**: 24 Ocak 2026

---

## Prerequisites

- Docker & Docker Compose
- Node.js 20+
- pnpm (optional, for local development)
- Gemini API Key

---

## Quick Start

### 1. Clone & Configure

```bash
git clone <repo-url>
cd icerik

# Copy environment template
cp .env.example .env

# Add your Gemini API key
echo "GEMINI_API_KEY=your_key_here" >> .env
```

### 2. Deploy with Docker

```bash
# Build and start all services
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### 3. Access

- **Dashboard**: http://localhost
- **API**: http://localhost:3000
- **Health**: http://localhost:3000/api/health

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | ✅ Yes | - | Google Gemini API key |
| `NODE_ENV` | No | production | Environment mode |
| `PORT` | No | 3000 | Engine API port |
| `LOG_LEVEL` | No | info | Logging level |

---

## Health Checks

| Service | Endpoint | Interval |
|---------|----------|----------|
| Engine | `/api/health` | 30s |
| Dashboard | `/` | 30s |

---

## Common Commands

```bash
# Stop services
docker compose down

# Restart engine
docker compose restart engine

# View engine logs
docker compose logs engine -f

# Rebuild after code changes
docker compose up -d --build

# Clean volumes (WARNING: deletes database)
docker compose down -v
```

---

## Persistent Data

- **SQLite Database**: `engine-data` volume
- **Location**: `/app/apps/engine/data`

### Backup Database

```bash
# Copy database from container
docker cp icerik-engine:/app/apps/engine/data/cache.db ./backup.db
```

---

## Troubleshooting

### Engine won't start

1. Check Gemini API key: `docker compose logs engine`
2. Verify port 3000 is free: `netstat -an | findstr 3000`

### Dashboard shows "Cannot connect to API"

1. Wait for engine health check (up to 30s)
2. Check engine logs: `docker compose logs engine`
3. Verify proxy config in nginx.conf

### Database issues

1. Check volume: `docker volume ls`
2. Reset data: `docker compose down -v && docker compose up -d`
