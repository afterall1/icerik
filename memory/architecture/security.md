# Security Architecture

> **Module**: Phase 20 - Security Hardening  
> **Version**: 1.17.0  
> **Date**: 24 Ocak 2026

---

## Overview

360° güvenlik katmanı eklenmiştir. Rate limiting, input validation, security headers, XSS prevention ve structured security logging implemente edildi.

---

## Security Middleware Stack

İstekler şu sırayla middleware'lerden geçer:

```
                    İSTEK GELİYOR
                         ↓
            ┌─────────────────────────┐
            │   1. Security Headers   │
            └─────────────────────────┘
                         ↓
            ┌─────────────────────────┐
            │   2. Error Handler      │
            └─────────────────────────┘
                         ↓
            ┌─────────────────────────┐
            │   3. Body Size Limit    │
            └─────────────────────────┘
                         ↓
            ┌─────────────────────────┐
            │   4. CORS Check         │
            └─────────────────────────┘
                         ↓
            ┌─────────────────────────┐
            │   5. Rate Limiting      │
            └─────────────────────────┘
                         ↓
            ┌─────────────────────────┐
            │   6. Input Validation   │
            └─────────────────────────┘
                         ↓
                  ✅ API İşlemi
```

---

## Rate Limiting

### Sliding Window Algorithm

In-memory Map ile IP-based rate limiting:

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General (`/trends*`, `/categories*`) | 100 req | 60s |
| AI (`/generate-script*`, `/ai/*`) | 20 req | 60s |

### Response Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706126400
Retry-After: 30 (sadece 429 durumunda)
```

### Implementation
- **File**: `apps/engine/src/api/securityMiddleware.ts`
- **Class**: `RateLimiter`
- Automatic cleanup every 60 seconds
- IP extraction: `x-forwarded-for` > `x-real-ip` > `unknown`

---

## Input Validation

### Zod Schema Validation

Tüm 25+ endpoint için strict Zod schema'lar:

| Endpoint | Schema |
|----------|--------|
| `GET /trends` | `trendQuerySchema` |
| `POST /generate-script` | `generateScriptBodySchema` |
| `POST /generate-scripts` | `generateScriptsBodySchema` |
| `POST /cache/invalidate` | `cacheInvalidateBodySchema` |
| `POST /trends/:id/classify` | `classifyTrendBodySchema` |
| `POST /scripts/score` | `scoreScriptBodySchema` |
| `POST /scripts/iterate` | `iterateScriptBodySchema` |
| `POST /generate-script-variants` | `generateVariantsBodySchema` |

### Validation Rules
- Query parameters: Type coercion, enum validation, min/max
- Request bodies: Required fields, nested objects, arrays
- Subreddit names: Regex validation (`^[a-zA-Z0-9_]+$`)

### Implementation
- **File**: `apps/engine/src/api/inputValidator.ts`
- **Middleware**: `validateRequest({ schema, type: 'query' | 'body' })`

---

## Security Headers

Her response'a eklenen başlıklar:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | MIME sniffing engelleme |
| `X-Frame-Options` | `DENY` | Clickjacking koruması |
| `X-XSS-Protection` | `1; mode=block` | Browser XSS filtresi |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer kontrolü |
| `Cache-Control` | `no-store, no-cache...` | Hassas veri cache engeli |
| `Strict-Transport-Security` | `max-age=31536000` | HSTS (production only) |

---

## CORS Configuration

### Development
```typescript
origin: ['http://localhost:5173', 'http://localhost:3000']
```

### Production
```typescript
origin: env.CORS_ORIGINS?.split(',') || ['https://localhost']
```

### Allowed Methods
- `GET`, `POST`, `OPTIONS`

---

## Error Handling

### Production Mode
```json
{
  "success": false,
  "error": "An internal error occurred. Please try again later.",
  "errorId": "a1b2c3d4",
  "timestamp": "2026-01-24T20:00:00Z"
}
```

### Development Mode
```json
{
  "success": false,
  "error": "Detailed error message",
  "stack": "Error stack trace...",
  "errorId": "a1b2c3d4",
  "timestamp": "2026-01-24T20:00:00Z"
}
```

---

## Security Logging

### Event Types
- `rate_limit_exceeded` - Rate limit aşımı
- `invalid_input` - Validation hatası
- `suspicious_request` - SQL injection/XSS denemesi
- `large_request_blocked` - Body size aşımı
- `cors_violation` - CORS ihlali

### Pattern Detection
Şüpheli patternler otomatik tespit:
- SQL Injection: `OR '1'='1`, `DROP TABLE`, `UNION SELECT`
- XSS: `<script>`, `javascript:`, `onclick=`
- Path Traversal: `../`, `%2e%2e`

### Implementation
- **File**: `apps/engine/src/utils/securityLogger.ts`
- In-memory event store (1000 events, 1 hour retention)
- `getSecurityStats()` for monitoring

---

## Frontend Security

### Content Security Policy (CSP)

`index.html` meta tag:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' http://localhost:3000 ws://localhost:*;
" />
```

### XSS Prevention

**File**: `apps/dashboard/src/lib/sanitize.ts`

| Function | Purpose |
|----------|---------|
| `escapeForDisplay()` | HTML entity encoding |
| `escapeForAttribute()` | Attribute encoding |
| `sanitizeUrl()` | URL protocol validation |
| `stripHtml()` | Complete HTML stripping |
| `safeTruncate()` | Entity-aware truncation |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `API_SECRET_KEY` | No | 32+ char key for future auth |

---

## File Structure

```
apps/engine/src/
├── api/
│   ├── securityMiddleware.ts  # Rate limiting, headers, error handler
│   └── inputValidator.ts      # Zod schemas, validation middleware
└── utils/
    └── securityLogger.ts      # Security event logging

apps/dashboard/
├── index.html                 # CSP meta tags
└── src/lib/
    └── sanitize.ts            # XSS prevention utilities
```
