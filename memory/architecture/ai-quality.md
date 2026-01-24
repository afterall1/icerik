# AI Quality Enhancement Architecture

> **Updated**: 24 Ocak 2026  
> **Phase**: 15

---

## Overview

Phase 15 introduces AI quality enhancement modules for script generation, including observability, dynamic examples, iteration, and A/B variants.

---

## Modules

### 1. AIMetrics (Observability)

**Location**: `apps/engine/src/ai/metrics/AIMetrics.ts`  
**Pattern**: Singleton  

```typescript
interface AIOperationMetrics {
    operationId: string;
    operationType: string;
    platform?: string;
    startTime: number;
    endTime?: number;
    latencyMs?: number;
    promptTokens?: number;
    responseTokens?: number;
    totalTokens?: number;
    qualityScore?: number;
    knowledgeCacheHit?: boolean;
    retryCount?: number;
    error?: string;
}
```

**Usage**:
```typescript
const metrics = getAIMetricsCollector();
const opId = metrics.startOperation('generate', 'tiktok');
// ... generation ...
metrics.endOperation(opId, { qualityScore: 85 });
```

---

### 2. ExampleSelector (Few-Shot)

**Location**: `apps/engine/src/ai/examples/ExampleSelector.ts`  
**Pattern**: Singleton  

Selects best few-shot examples based on:
- Category match (40%)
- NES proximity (30%)
- Subreddit match (20%)
- Keyword overlap (10%)

```typescript
const selector = getExampleSelector();
const examples = selector.selectExamples(trend, platform, { maxExamples: 3 });
```

---

### 3. ScriptIterator (Partial Regeneration)

**Location**: `apps/engine/src/ai/iteration/ScriptIterator.ts`  
**Pattern**: Singleton  

**Iteration Targets**:
| Target | Description |
|--------|-------------|
| `hook` | Regenerate opening hook |
| `body` | Regenerate main content |
| `cta` | Regenerate call-to-action |
| `title` | Regenerate title |
| `hashtags` | Regenerate hashtags |
| `shorten` | Reduce word count 20% |
| `lengthen` | Increase word count 20% |
| `change_tone` | Modify tone (with param) |
| `add_hooks` | Add re-hook points |

```typescript
const iterator = getScriptIterator();
const result = await iterator.iterateScript(script, {
    target: 'hook',
    additionalInstructions: 'Daha enerjik yap'
});
```

---

### 4. VariantGenerator (A/B Testing)

**Location**: `apps/engine/src/ai/variants/VariantGenerator.ts`  
**Pattern**: Singleton  

**Variant Styles**:
| Style | Description |
|-------|-------------|
| `high_energy` | Fast-paced, quick cuts |
| `story_driven` | Narrative arc, emotional |
| `controversial` | Debate-starter, hot take |
| `educational` | Explainer, tutorial |
| `reaction` | Commentary style |

```typescript
const generator = getVariantGenerator();
const variants = await generator.generateVariants(trend, options, {
    styles: ['high_energy', 'story_driven'],
    includeScoring: true
});
```

---

## API Endpoints

| Endpoint | Method | Module |
|----------|--------|--------|
| `/api/ai/metrics` | GET | AIMetrics |
| `/api/scripts/iterate` | POST | ScriptIterator |
| `/api/generate-script-variants` | POST | VariantGenerator |

---

## Module Relationships

```
TrendData
    ↓
ExampleSelector → Few-shot examples
    ↓
PlatformAgent → Script generation
    ↓
AlgorithmScorer → Quality score
    ↓
ScriptIterator → Refinement
    ↓
VariantGenerator → A/B options
    ↓
AIMetrics ← All operations logged
```

---

## Dashboard Components

| Component | Backend Module |
|-----------|----------------|
| IterationPanel | ScriptIterator |
| (Future) VariantSelector | VariantGenerator |
| (Future) MetricsPanel | AIMetrics |

---

## Type Strategy

**Problem**: Circular dependencies between types.ts and platformTypes.ts

**Solution**: 
- Generic types in `types.ts`: `ScriptVariant<TScript = unknown>`
- Concrete aliases in `platformTypes.ts`: `type PlatformScriptVariant = ScriptVariant<PlatformScript>`
