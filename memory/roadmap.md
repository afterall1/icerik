# Roadmap

> **Proje**: İçerik Trend Engine  
> **Son Güncelleme**: 22 Ocak 2026

---

## ✅ Completed (MVP)

### Phase 1: SQLite Caching Layer
- [x] better-sqlite3 integration
- [x] Cache schema (trends, subreddit_stats, request_log)
- [x] TTL-based expiration
- [x] X-Cache headers

### Phase 2: Background Polling Worker
- [x] Tier-based scheduler
- [x] Graceful shutdown
- [x] Worker management endpoints

### Phase 3: Dashboard Polish
- [x] ErrorBoundary component
- [x] Skeleton loading components
- [x] React Query integration

### Phase 4: AI Content Script Generation
- [x] Gemini API client
- [x] ScriptGenerator with prompts
- [x] Video format templates
- [x] API endpoints

---

## 🟡 In Progress

### Phase 5: Dashboard AI Integration
- [ ] ScriptGenerator.tsx UI component
- [ ] TrendCard "Generate Script" button
- [ ] Script preview modal
- [ ] Copy to clipboard

---

## 📋 Backlog (Prioritized)

### High Priority
- [ ] TrendExplorer React Query migration
- [ ] Mobile responsive testing
- [ ] Error handling improvements

### Medium Priority
- [ ] Docker configuration
- [ ] GitHub Actions CI/CD
- [ ] E2E tests (Playwright)

### Low Priority
- [ ] Multi-platform integration (X/Twitter, TikTok API)
- [ ] User authentication
- [ ] Saved trends / favorites
- [ ] Export to content calendar

---

## 🔮 Future Ideas

- ML-based NES optimization (learn from user feedback)
- Real-time trending alerts (WebSocket)
- Content performance tracking
- Team collaboration features
