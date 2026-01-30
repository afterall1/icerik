# Voice Generation System

> **Phase**: 24  
> **Status**: ✅ Complete  
> **Last Updated**: 30 Ocak 2026

---

## Overview

Text-to-Speech (TTS) sistemi, oluşturulan video scriptlerini profesyonel ses kaydına dönüştürür. Multi-provider mimari ile ElevenLabs ve Fish Audio destekler.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                           │
├─────────────────────────────────────────────────────────┤
│  VoiceSelectionModal    │  VoicePreviewCard             │
│  useVoiceSelection (IDB)│  useVoiceGeneration           │
│  sanitizeForTTS        │  BroadcastChannel sync         │
└────────────────────────┬────────────────────────────────┘
                         │ /api/voice/*
┌────────────────────────▼────────────────────────────────┐
│                      Backend                            │
├─────────────────────────────────────────────────────────┤
│  VoiceService.ts       │  VoiceCache.ts                 │
│  Multi-provider TTS    │  SQLite cache (7d TTL)         │
│  MP3 header detection  │  Audio hash keying             │
├─────────────────────────────────────────────────────────┤
│  providers/            │                                │
│  ├─ ElevenLabsProvider │  Primary TTS                   │
│  └─ FishAudioProvider  │  Fallback TTS                  │
└─────────────────────────────────────────────────────────┘
```

---

## Core Components

### Backend

| Component | Path | Description |
|-----------|------|-------------|
| **VoiceService** | `engine/src/voice/VoiceService.ts` | Multi-provider TTS orchestration |
| **VoiceCache** | `engine/src/voice/VoiceCache.ts` | SQLite-based audio caching |
| **ElevenLabsProvider** | `engine/src/voice/providers/` | ElevenLabs API wrapper |
| **FishAudioProvider** | `engine/src/voice/providers/` | Fish Audio API wrapper |
| **scriptSanitizer** | `engine/src/ai/scriptSanitizer.ts` | Backend bracket cleanup |

### Frontend

| Component | Path | Description |
|-----------|------|-------------|
| **useVoiceSelection** | `dashboard/src/lib/useVoiceSelection.ts` | IndexedDB voice persistence |
| **useVoiceGeneration** | `dashboard/src/lib/useVoiceGeneration.ts` | TTS generation hook |
| **VoiceSelectionModal** | `dashboard/src/components/organisms/` | Voice picker UI |
| **VoicePreviewCard** | `dashboard/src/components/molecules/` | Audio preview with retry |
| **textSanitizer** | `dashboard/src/lib/textSanitizer.ts` | Frontend bracket cleanup |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/voice/generate` | Generate TTS audio |
| `GET` | `/api/voice/status` | Provider status & quota |
| `GET` | `/api/voice/preview/:voiceId` | Base64 preview (7d cache) |
| `POST` | `/api/voice/cache/clear` | Clear audio cache |

---

## Key Patterns

### 1. Multi-Provider Fallback

```typescript
// VoiceService tries ElevenLabs first, falls back to FishAudio
const result = await this.tryProvider('elevenlabs', options);
if (!result.success) {
    return await this.tryProvider('fishaudio', options);
}
```

### 2. BroadcastChannel Sync

```typescript
// Cross-tab voice selection sync
const CHANNEL_NAME = 'icerik_voice_selection_sync';
channel.postMessage({ type: 'VOICE_SELECTION_UPDATED' });
channel.onmessage = () => reloadStateFromDB();
```

### 3. Aggressive Bracket Cleanup

```typescript
// Pattern: Remove ALL [UPPERCASE...] annotations
const BRACKET_PATTERN = /\[([A-ZÇĞİÖŞÜ][^\]]*)\]/g;

// Examples removed:
// [ZOOM IN], [TEXT: "DİKKAT!"], [TRANSITION: Smooth Zoom]
// [RETENTION HOOK: ...], [SUBSCRIBE MOMENT], [LOOP POINT]
```

### 4. MP3 Header Detection

```typescript
// MIME type fallback when Content-Type is wrong
const isMP3 = buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0  // Sync
           || buffer[0] === 0x49 && buffer[1] === 0x44;  // ID3
```

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ELEVENLABS_API_KEY` | Yes* | ElevenLabs API key |
| `FISHAUDIO_API_KEY` | No | Fish Audio API key (fallback) |

*At least one provider must be configured.

### CSP Configuration

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
    ...
    media-src 'self' data: blob:;
">
```

---

## Cache Strategy

| Cache Type | TTL | Storage |
|------------|-----|---------|
| Voice Previews | 7 days | SQLite (backend) |
| Generated Audio | 24 hours | SQLite (backend) |
| Voice Selection | Permanent | IndexedDB (frontend) |

---

## Security Considerations

1. **Rate Limiting**: AI endpoints limited to 20 req/min
2. **Text Length**: Max 10,000 characters per generation
3. **Input Sanitization**: Bracket cleanup prevents prompt injection
4. **CSP**: Strict media-src with data: and blob: only

---

## Related ADRs

- **ADR-011**: Backend-Cached Base64 Preview Strategy
- **ADR-012**: BroadcastChannel Sync Pattern for Voice Selection
