---
name: Video E2E Test
description: Comprehensive video generation E2E testing skill with browser automation
---

# Video E2E Test Skill

This skill provides comprehensive end-to-end testing for the video generation workflow using Antigravity's browser automation capabilities.

## When to Use

Use this skill when you need to:
- Verify complex video generation flows visually
- Debug issues that are hard to reproduce
- Create recorded demos of workflows
- Test edge cases with real browser interaction
- Perform exploratory testing

## Prerequisites

1. Engine running on `localhost:3001`
2. Dashboard running on `localhost:5173`
3. At least one trend available in the system

## Test Scenarios

### Scenario 1: Complete Video Generation Flow

```yaml
name: Full Video Generation
timeout: 5 minutes
steps:
  1. Navigate to http://localhost:5173
  2. Wait for trends to load (look for "Trend Engine" header)
  3. Click on "Teknoloji" category tab
  4. Hover on first trend card
  5. Click "Script Oluştur" button
  6. Wait for platform cards to appear (TikTok, Reels, Shorts)
  7. On TikTok card, click "Görsel Bul" button
  8. Select 2 images from the visual panel
  9. Close visual panel (press Escape)
  10. Click "Ses Oluştur" button
  11. Wait for audio to generate (look for ✓ Hazır indicator)
  12. Click "Video" button to open video modal
  13. Verify modal shows: Görseller, Ses, Ayarlar sections
  14. Configure options:
      - Caption Style: Hormozi
      - Transition: Smooth
      - Ken Burns: Enabled
  15. Click "Video Oluştur" button
  16. Monitor console for generation progress
  17. Report final status (success/failure)
```

### Scenario 2: Voice Generation Testing

```yaml
name: Voice Generation with Provider Selection
timeout: 2 minutes
steps:
  1. Navigate to dashboard
  2. Generate script for any trend
  3. On platform card, open voice modal
  4. Verify available voice providers
  5. Select ElevenLabs provider
  6. Generate voice
  7. Verify audio player appears
  8. Test play/pause functionality
  9. Verify audio duration is displayed
```

### Scenario 3: Error Handling

```yaml
name: Error Recovery Testing
timeout: 3 minutes
steps:
  1. Navigate to dashboard
  2. Generate script
  3. Try to generate video WITHOUT generating audio first
  4. Verify error message appears
  5. Generate audio
  6. Retry video generation
  7. Verify it proceeds correctly
```

## Console Commands

When running this skill, monitor the browser console for these key messages:

```
✅ Success indicators:
- "[VideoGenerationModal] handleGenerate called"
- "[VideoGenerationModal] Converting blob to base64 directly..."
- "[VideoGenerationModal] Base64 conversion complete"
- "[VideoGenerationModal] startGeneration called successfully"

❌ Error indicators:
- "[VideoGenerationModal] Missing audio data"
- "[VideoGenerationModal] Failed to prepare audio"
- "ERR_INSUFFICIENT_RESOURCES" (polling issue)
```

## Network Requests to Monitor

| Endpoint | Method | Expected Status |
|----------|--------|-----------------|
| `/api/scripts/generate` | POST | 200 |
| `/api/voice/generate` | POST | 200 (binary) |
| `/api/video/generate` | POST | 200 |
| `/api/video/status/:id` | GET | 200 |
| `/api/video/jobs` | GET | 200 |

## Verification Checklist

After running tests, verify:

- [ ] All scripts generated successfully
- [ ] Voice audio plays correctly
- [ ] Video modal opens with all sections
- [ ] Base64 conversion works (no CSP errors)
- [ ] Video generation job starts
- [ ] Job status polling works
- [ ] No console errors

## Troubleshooting

### CSP Errors with Blob URLs
If you see "Content Security Policy" errors when fetching blob URLs:
- Ensure `audioBlob` prop is being used instead of `audioUrl`
- Check that `blobToBase64` is using FileReader, not fetch

### Missing Audio Data
If video generation fails with "Missing audio data":
- Verify audio was generated first (check for ✓ Hazır)
- Ensure `audioBlob` is passed from `useVoiceGeneration` hook

### Infinite Polling Loop
If you see continuous API calls to `/api/video/jobs`:
- Check `useVideoJobs` hook dependencies
- Ensure `hasActiveJobs` is not in useEffect dependency array

## Files to Review

- `apps/dashboard/e2e/video-generation.spec.ts` - Full E2E tests
- `apps/dashboard/e2e/voice-generation.spec.ts` - Voice tests
- `apps/dashboard/e2e/helpers/test-helpers.ts` - Test utilities
