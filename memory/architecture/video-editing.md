# Video Editing System Architecture

> **Phase**: 26  
> **Status**: ✅ Complete  
> **Created**: 30 Ocak 2026

---

## Overview

Automated video generation pipeline that combines scripts, images, and audio into platform-ready vertical videos (1080x1920).

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    VideoEditingAgent (Orchestrator)                  │
│                                                                      │
│  Input: Script + Images + Audio → Output: Platform-Ready Video      │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌─────────────────┐      ┌─────────────────────┐      ┌─────────────────┐
│  TimelineBuilder │      │  CaptionGenerator   │      │  AudioMixer     │
│                 │      │                     │      │                 │
│ • Section timing│      │ • Word-by-word sync │      │ • TTS overlay   │
│ • Image duration│      │ • 15-20 CPS         │      │ • Audio ducking │
│ • Ken Burns     │      │ • Safe zone aware   │      │ • Normalization │
└─────────────────┘      └─────────────────────┘      └─────────────────┘
         │                          │                          │
         └──────────────────────────┼──────────────────────────┘
                                    ▼
                        ┌─────────────────────────┐
                        │     FFmpegComposer      │
                        │                         │
                        │ • Filter complex gen    │
                        │ • Ken Burns zoompan     │
                        │ • Drawtext captions     │
                        │ • Layer composition     │
                        └────────────┬────────────┘
                                     ▼
                        ┌─────────────────────────┐
                        │     FFmpeg Process      │
                        │                         │
                        │ • H.264 encoding        │
                        │ • Platform optimization │
                        └─────────────────────────┘
```

---

## Components

### VideoEditingAgent.ts

Main orchestrator (Singleton pattern):

```typescript
const agent = getVideoEditingAgent();
const result = await agent.generateVideo(project);
```

**Responsibilities**:
- Coordinates all sub-modules
- Job status tracking
- FFmpeg process spawning
- Error handling

---

### TimelineBuilder.ts

Converts script sections to timed image clips:

```typescript
const timeline = builder.buildTimeline(script, images, audioDuration);
```

**Features**:
- Section timing based on text length ratio
- Ken Burns effect assignment (alternating)
- Transition configuration

---

### CaptionGenerator.ts

Word-by-word caption timing:

```typescript
const sections = generator.generateCaptions(timeline);
```

**Standards**:
- 15-20 CPS (Netflix/BBC standard)
- Emphasis word detection
- Platform safe zone awareness
- SRT export support

---

### AudioMixer.ts

Audio processing configuration:

```typescript
const mixer = createAudioMixer({
  voiceoverPath: '/path/to/voice.mp3',
  backgroundMusicPath: '/path/to/music.mp3',
  enableDucking: true
});
```

**Features**:
- Audio ducking (sidechain compression)
- Loudness normalization (-16 LUFS)
- Fade in/out

---

### FFmpegComposer.ts

Generates FFmpeg filter complex:

```typescript
const { filterComplex, inputFiles } = composer.generateFilterComplex(
  sections, totalDuration
);
```

**Filters Generated**:
- `scale` + `crop` for 9:16 aspect
- `zoompan` for Ken Burns
- `overlay` for image sequencing
- `drawtext` for captions

---

## Platform Profiles

| Platform | Resolution | Codec | Bitrate | Safe Zone |
|----------|------------|-------|---------|-----------|
| TikTok | 1080x1920 | H.264 | 8 Mbps | Bottom 20% |
| Reels | 1080x1920 | H.264 | 10 Mbps | Bottom 20% |
| Shorts | 1080x1920 | H.264 | 10 Mbps | Top/Bottom 15% |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/video/generate` | POST | Start video generation |
| `/api/video/status/:jobId` | GET | Get job progress |
| `/api/video/jobs` | GET | List all jobs |
| `/api/video/jobs/cleanup` | POST | Clean completed jobs |

---

## Key Patterns

### Ken Burns Effect

```typescript
const effects = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right'];
// Automatically alternates for visual variety
```

### Caption Styles

| Style | Position | Animation | Use Case |
|-------|----------|-----------|----------|
| hormozi | center | pop | High engagement |
| classic | bottom | fade | Traditional |
| minimal | bottom | none | Clean look |

---

## Dependencies

```json
{
  "fluent-ffmpeg": "^2.1.3",
  "@ffmpeg-installer/ffmpeg": "^1.1.0",
  "@ffprobe-installer/ffprobe": "^2.1.0"
}
```

**System Requirement**: FFmpeg must be installed and in PATH.

---

## Related Docs

- `memory/architecture/voice-system.md` - TTS integration
- `memory/architecture/local-storage.md` - Visual selection storage
- `memory/api/endpoints.md` - Full API documentation
