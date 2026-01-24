# Native Gemini Education System Architecture

> **Module**: `apps/engine/src/ai/knowledge/`  
> **Son Güncelleme**: 24 Ocak 2026  
> **Phase**: 13

---

## Overview

NotebookLM API mevcut olmadığı için, Native Gemini yaklaşımı ile platform algorithm bilgisi AI prompt'larına enjekte edilir. Markdown dosyaları knowledge base olarak kullanılır.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     Knowledge Base                            │
│                   (Markdown Files)                            │
├──────────────────────────────────────────────────────────────┤
│  platforms/                    content-patterns/              │
│  ├── tiktok-algorithm.md       ├── viral-hooks.md             │
│  ├── instagram-reels.md        ├── cta-templates.md           │
│  └── youtube-shorts.md         └── script-structures.md       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │       KnowledgeLoader         │
              │                               │
              │ • loadPlatformKnowledge()     │
              │ • loadContentPattern()        │
              │ • compilePlatformKnowledge()  │
              │ • In-memory caching           │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │      BasePlatformAgent        │
              │                               │
              │ buildContentPrompt() injects  │
              │ knowledge into AI context     │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │        Gemini API             │
              │                               │
              │ AI generates with deep        │
              │ platform understanding        │
              └───────────────────────────────┘
```

---

## Knowledge Base Structure

### Platform Knowledge Files

| File | Content | Lines |
|------|---------|-------|
| `platforms/tiktok-algorithm.md` | FYP mechanics, hooks, loops, hashtags | ~300 |
| `platforms/instagram-reels.md` | Explore feed, shares/saves, aesthetics | ~300 |
| `platforms/youtube-shorts.md` | Retention, subscribe CTAs, SEO | ~330 |

### Content Pattern Files

| File | Content | Lines |
|------|---------|-------|
| `content-patterns/viral-hooks.md` | 10 hook categories with examples | ~280 |
| `content-patterns/cta-templates.md` | Platform-specific CTA templates | ~270 |
| `content-patterns/script-structures.md` | 8 script structure templates | ~290 |

---

## KnowledgeLoader Module

**Location**: `apps/engine/src/ai/knowledge/loader.ts`

```typescript
class KnowledgeLoader {
    // Load platform-specific knowledge
    async loadPlatformKnowledge(platform: Platform): Promise<string>;
    
    // Load content pattern by type
    async loadContentPattern(patternType: PatternType): Promise<string>;
    
    // Compile all knowledge for a platform
    async compilePlatformKnowledge(platform: Platform): Promise<CompiledKnowledge>;
    
    // Extract specific section from markdown
    extractSection(content: string, sectionName: string): string | null;
}
```

### Caching Strategy

```typescript
// In-memory cache with lazy loading
private cache = new Map<string, { content: string; loadedAt: number }>();
private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

async loadFile(path: string): Promise<string> {
    const cached = this.cache.get(path);
    if (cached && Date.now() - cached.loadedAt < this.CACHE_TTL) {
        return cached.content;
    }
    const content = await fs.readFile(path, 'utf-8');
    this.cache.set(path, { content, loadedAt: Date.now() });
    return content;
}
```

---

## Knowledge Injection Flow

```typescript
// In BasePlatformAgent.buildContentPrompt()

protected async buildContentPrompt(trend: TrendData, options: AgentOptions): string {
    const loader = getKnowledgeLoader();
    
    // Load platform-specific knowledge
    const platformKnowledge = await loader.compilePlatformKnowledge(this.platform);
    
    // Inject into prompt
    return `
## Platform Expert Knowledge
${platformKnowledge.algorithmRules}

## Viral Hook Patterns  
${platformKnowledge.hookPatterns}

## Script Structure Guide
${platformKnowledge.structureGuide}

## Trend to Transform
Title: ${trend.title}
Category: ${trend.category}
...
    `;
}
```

---

## Knowledge Content Examples

### TikTok Algorithm Knowledge

```markdown
## FYP Algorithm Mechanics

TikTok's For You Page algorithm prioritizes:
1. **Watch Time** - Most critical metric (aim for 100%+ with loops)
2. **Completion Rate** - Videos watched to end get massive boost
3. **Re-watches** - Loop design creates re-watch behavior
4. **Shares** - Shares > Comments > Likes in algorithm weight

## Hook Timing

- First 1 second is CRITICAL - no slow intros
- "Pattern interrupt" every 2-3 seconds
- Text on screen hooks eye movement
```

### Viral Hooks Pattern

```markdown
## 1. Controversy Hook
"Unpopular opinion but..."
"I'm going to get hate for this but..."
"Everyone's wrong about [topic]..."

## 2. Curiosity Gap Hook
"I finally discovered why..."
"This is the secret that..."
"Nobody talks about this but..."
```

---

## API Usage

Knowledge system is internal - no direct API endpoints. Used automatically by platform agents during script generation.

**Metrics Tracked:**
- `knowledgeCacheHit` - Whether knowledge was loaded from cache
- Tracked in `AIMetrics` module

---

## Council Decision (ADR Reference)

**Why Native Gemini instead of NotebookLM?**

> NotebookLM Enterprise requires corporate agreement. No public API exists.
> Native approach: Markdown files → KnowledgeLoader → Context injection
> 
> Result: Same depth of knowledge, full control, no external dependency.

See: `memory/adr/decisions.md` (Council Decisions section)
