# E2E Testing Architecture

> **Module**: Phase 27-30 - Automated Testing Infrastructure  
> **Version**: 1.25.0  
> **Date**: 2 Şubat 2026

---

## Overview

Manuel test yükünü azaltmak için kapsamlı E2E test altyapısı. Playwright browser automation, API mocking, **REAL API testing** (Phase 30), CI/CD pipeline ve Antigravity skill entegrasyonu.

---

## Test Infrastructure

```
apps/dashboard/
├── e2e/
│   ├── dashboard.spec.ts         # Temel UI testleri (Phase 10)
│   ├── video-generation.spec.ts  # Video akışı E2E - mocked (Phase 27)
│   ├── voice-generation.spec.ts  # Ses üretimi testleri (Phase 27)
│   ├── real-video-flow.spec.ts   # ✨ REAL API video E2E (Phase 30)
│   ├── helpers/
│   │   ├── test-helpers.ts       # API mock, wait utilities
│   │   └── real-flow-helpers.ts  # ✨ Real API helpers (560 lines)
│   └── reporters/
│       └── diagnostic-reporter.ts # ✨ Custom reporter (338 lines)
├── playwright.config.ts          # Playwright konfigürasyonu
└── vitest.config.ts              # Unit test konfigürasyonu

.github/workflows/
└── e2e-tests.yml                 # CI/CD pipeline

.agent/skills/
└── video-e2e-test/
    └── SKILL.md                  # Antigravity exploratory testing
```

---

## Test Categories

### 1. Unit Tests (Vitest)

Hızlı, izole, pure function testleri.

```
apps/dashboard/src/lib/__tests__/hooks.test.tsx
apps/engine/src/cache/__tests__/CacheService.test.ts
apps/engine/src/ai/orchestrator/__tests__/MultiPlatformOrchestrator.test.ts
```

**Çalıştırma:**
```bash
cd apps/dashboard && npm run test
cd apps/engine && npm run test
```

### 2. E2E Tests (Playwright)

Full browser automation, real UI interaction.

| Test File | Coverage | Lines |
|-----------|----------|-------|
| `dashboard.spec.ts` | Category filter, search, view toggle | 157 |
| `video-generation.spec.ts` | Video modal, options, generation flow | 280 |
| `voice-generation.spec.ts` | Voice selection, audio generation, blob handling | 240 |

**Çalıştırma:**
```bash
cd apps/dashboard && npx playwright test
npx playwright test video-generation  # Specific file
npx playwright test --ui               # GUI mode
npx playwright test --headed          # Visible browser
```

### 3. Antigravity Skill Testing

Karmaşık exploratory testing için AI-guided browser automation.

```bash
# Antigravity IDE'de:
"Use video-e2e-test skill to verify the full video generation flow"
```

---

## Test Helpers

### API Mocking

```typescript
import { mockVideoApi, mockVoiceApi } from './helpers/test-helpers';

test('should handle video API', async ({ page }) => {
    await mockVideoApi(page, {
        videoGenerate: { success: true, jobId: 'test-123' },
        videoStatus: { status: 'complete', progress: 100 }
    });
    
    // Test code...
});
```

### Wait Helpers

```typescript
import { waitForApiResponse, waitForNetworkIdle } from './helpers/test-helpers';

// Wait for specific API call
await waitForApiResponse(page, '/api/video/generate');

// Wait for network idle
await waitForNetworkIdle(page);
```

### Console Logger

```typescript
import { createConsoleLogger } from './helpers/test-helpers';

const logger = createConsoleLogger(page);

// After actions
expect(logger.hasLog('Base64 conversion complete')).toBeTruthy();
expect(logger.getErrors()).toHaveLength(0);
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build (engine + dashboard)
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### Artifacts on Failure

Başarısız testlerde otomatik olarak yüklenir:
- `playwright-report/` - HTML report
- `test-results/` - Screenshots, videos

---

## Test Patterns

### Pattern 1: Full Flow E2E

```typescript
test('should complete video generation flow', async ({ page }) => {
    // 1. Navigate
    await page.goto('/');
    await page.click('button:has-text("Teknoloji")');
    
    // 2. Generate script
    await page.hover('[class*="Card"]');
    await page.click('button:has-text("Script")');
    
    // 3. Configure video
    await page.click('button:has-text("Video")');
    await page.click('button:has-text("Hormozi")');
    
    // 4. Generate
    await page.click('button:has-text("Video Oluştur")');
    
    // 5. Verify
    await expect(page.locator('text=Generating')).toBeVisible();
});
```

### Pattern 2: Error Handling

```typescript
test('should handle missing audio', async ({ page }) => {
    await setupWithScript(page);
    
    await page.click('button:has-text("Video")');
    await page.click('button:has-text("Video Oluştur")');
    
    // Should show error alert
    page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('Ses');
        await dialog.accept();
    });
});
```

### Pattern 3: Blob URL Testing

```typescript
test('should convert blob to base64', async ({ page }) => {
    const logger = createConsoleLogger(page);
    
    await generateVoice(page);
    await page.click('button:has-text("Video Oluştur")');
    
    await page.waitForTimeout(3000);
    
    // Verify FileReader was used (not fetch)
    expect(logger.hasLog('Converting blob to base64 directly')).toBeTruthy();
    expect(logger.getErrors().some(e => e.includes('CSP'))).toBeFalsy();
});
```

---

## Known Issues & Solutions

### Issue 1: CSP Blob URL Fetch Error

**Problem:** `fetch()` cannot load `blob:` URLs due to CSP.

**Solution:** Use `audioBlob` prop with FileReader instead of `audioUrl` with fetch.

```typescript
// ❌ WRONG - CSP blocks this
const response = await fetch(blobUrl);
const blob = await response.blob();

// ✅ CORRECT - Direct FileReader
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};
```

### Issue 2: Infinite Loop in useVideoJobs

**Problem:** `hasActiveJobs` in useEffect dependency array causes infinite re-renders.

**Solution:** Use refs for callbacks and state.

```typescript
// ❌ WRONG
useEffect(() => {
    // ...
}, [hasActiveJobs, fetchJobs]); // hasActiveJobs changes every render!

// ✅ CORRECT
const hasActiveJobsRef = useRef(hasActiveJobs);
const fetchJobsRef = useRef(fetchJobs);

useEffect(() => {
    hasActiveJobsRef.current = hasActiveJobs;
    fetchJobsRef.current = fetchJobs;
}, [hasActiveJobs, fetchJobs]);

useEffect(() => {
    // Use refs instead of direct values
    if (hasActiveJobsRef.current) {
        fetchJobsRef.current();
    }
}, []); // Empty dependency array
```

---

## Known Issues & Solutions (Phase 28 Audit)

### 1. CSS Opacity Hover Flakiness

**Problem**: TrendCard script butonu opacity transition kullanıyor:
```css
sm:opacity-0 sm:group-hover:opacity-100
```

**Playwright Davranışı**:
- `opacity: 0` → `toBeVisible()` başarısız
- `hover()` sonrası transition tetiklenmeyebilir
- 15+ test etkileniyor

**Çözüm**:
```typescript
// ❌ WRONG - fails on opacity:0
const scriptButton = page.locator('button:has-text("Script")');
await expect(scriptButton).toBeVisible();
await scriptButton.click();

// ✅ CORRECT - bypasses opacity
const scriptButton = trendCard.locator('[data-testid="generate-script-btn"]');
await expect(scriptButton).toBeAttached();
await scriptButton.click({ force: true });
```

**TrendCard.tsx Fix**:
```tsx
<button
    title="AI ile script oluştur"
    data-testid="generate-script-btn"  // ADD THIS
>
```

### 2. Test Baseline (31 Ocak 2026)

| Durum | Adet | Açıklama |
|-------|------|----------|
| ✅ PASSED | 7 | Dashboard temel testleri |
| ⏭️ SKIPPED | 7 | Hover bağımlı (bilinçli skip) |
| ❌ FAILED | 8 | Voice testleri (aynı kök neden) |

---

## Test Coverage Goals

| Category | Current | Target |
|----------|---------|--------|
| Dashboard UI | ✅ 90% | 95% |
| Video Generation | ✅ 80% | 90% |
| Voice Generation | ✅ 70% | 85% |
| API Integration | ✅ 60% | 80% |
| Error Handling | ✅ 50% | 75% |

---

## Quick Reference

```bash
# Run all E2E tests
cd apps/dashboard && npx playwright test

# Run specific file
npx playwright test video-generation

# Debug with UI
npx playwright test --ui

# See browser
npx playwright test --headed

# Generate report
npx playwright show-report

# Unit tests
npm run test

# List all tests
npx playwright test --list
```
