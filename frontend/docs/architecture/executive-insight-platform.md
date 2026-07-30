# Executive Insight Platform — Architecture

## Objective

Provide the official domain foundation for all Executive Insights across the Royale AI Platform. This layer will eventually power insight generation, persistence, lifecycle, correlation, and distribution to all downstream consumers (Dashboard, Executive Copilot, Timeline, Alerts, Narrative AI).

## Lifecycle

```
    NEW ──→ ACTIVE ──→ RESOLVED ──→ ARCHIVED
     │                    │
     └────────────────────┘ (direct ARCHIVED — via engine.archive)
```

- **NEW** — generated but not yet reviewed
- **ACTIVE** — acknowledged / visible to the user
- **RESOLVED** — root cause addressed, insight closed
- **ARCHIVED** — historical record, no longer displayed. Never auto-reactivated.

### Lifecycle Transitions

| From | To | Trigger |
|------|----|---------|
| (inexistent) | NEW | First detection by Lifecycle Engine |
| NEW | ACTIVE | Re-detected in subsequent run |
| ACTIVE | ACTIVE | Re-detected (metadata updated, occurrenceCount incremented) |
| ACTIVE | RESOLVED | Not detected in current run |
| RESOLVED | ACTIVE | Re-detected (reactivation) |
| RESOLVED | ARCHIVED | Explicit archive operation |
| NEW | ARCHIVED | Explicit archive operation |
| ARCHIVED | ACTIVE | Explicit reopen through engine.reopen |

### Lifecycle Fields

| Field | Meaning | Set by |
|-------|---------|--------|
| `status` | Current state (NEW / ACTIVE / RESOLVED / ARCHIVED) | Builder (initial), Lifecycle Engine |
| `firstDetectedAt` | When this InsightKey was first ever seen | Builder (initial), preserved by Engine |
| `lastDetectedAt` | When this InsightKey was last detected in a run | Builder (initial), updated by Engine on detection |
| `occurrenceCount` | How many times this InsightKey has been detected | Builder (initial = 1), incremented by Engine on detection |
| `lastEvaluationRun` | Which sourceRunId last processed this insight | Builder (initial), updated by Engine |
| `resolvedAt` | When the insight was resolved | Lifecycle Engine |
| `archivedAt` | When the insight was archived | Builder (null), engine.archive |
| `version` | Mutation counter — incremented on every persisted state change | Builder (= 1), incremented by Engine |

## Flow

```
Data Sources
  ├── Marketplace Engine
  ├── Financial Engine
  ├── Inventory Engine
  ├── Sales Engine
  ├── Products Engine
  └── Purchasing Engine
          │
          ▼
  Executive Insight Builders
    — One builder per module
    — Consumes existing insights + recommendations from module's own builders
    — Maps to ExecutiveInsight entity preserving severity, priority, evidence
    — Sets initial lifecycle fields (firstDetectedAt, lastDetectedAt, occurrenceCount = 1, lastEvaluationRun)
          │
          ▼
  Executive Insight Lifecycle Engine
    — Receives builder output and LifecycleContext (refDate, sourceRunId)
    — Queries existing insights by InsightKey
    — Reconciles: new → NEW, re-detected → ACTIVE, missing → RESOLVED, archived → ignored
    — Preserves builder data (evidence, severity, priority)
    — Updates only lifecycle metadata
    — Emits ExecutiveInsightDomainEvent to Timeline on each transition
    — Persists through ExecutiveInsightRepository
          ├──────────────────────────────────────┐
          ▼                                      ▼
  Executive Insight Repository    Executive Insight Timeline
    — Abstract contract (interface)   — Abstract contract (interface)
    — In-memory (test adapter)        — In-memory (test adapter)
    — Persistent storage (future)     — Ordered event collection
          │                            — Event-sourced history
          ▼                            — Time-ordered per InsightKey
  Executive Intelligence Engine
    — CENTRALIZED QUERY FACADE — single entry point for ALL consumers
    — Wraps Repository + Timeline + TimelineQueries + AlertEngine
    — No consumer accesses Repository or Timeline directly
    — prepareNarrativeContext() provides structured data to Narrative Engine
          │
          ├──────────────────────────────────────────────────────────────┐
          ▼                                                              ▼
  CopilotExecutiveFacade                                  Executive Narrative Engine
    — Official bridge from Copilot                          — Consumes NarrativeContext
      to Intelligence Platform                              — Delegates to abstract Provider
    — Uses ONLY IntelligenceEngine                          — Falls back to TemplateProvider
      and NarrativeEngine                                   — Validates via FactualityGuard
    — No direct access to Repository,                        — Returns typed output
      Timeline, Lifecycle, or modules                       — No domain access
          │                                                       │
          ▼                                                       ▼
  Executive Copilot                                   Narrative Provider (abstract)
    — Pure orchestrator — no business logic              ├── TemplateProvider (built-in)
    — Consumes insights, narratives,                     └── AI Provider (future)
      alerts, timeline via facade only
    — Never accesses domain engines
    — Never creates classifications
          │
          ▼
  Dashboard & Consumers
    — Share the same source of truth
    — Query through Intelligence Engine only
```

## Responsibilities

| Layer | Responsibility |
|-------|---------------|
| Engines | Produce structured data about a domain |
| Module Insight Builders | Produce domain-specific InsightData / RecommendationData |
| Executive Insight Builders | Transform module insights into ExecutiveInsight entities |
| Lifecycle Engine | Reconcile new insights with existing state, manage lifecycle transitions, emit domain events |
| Domain Events | Typed, immutable records of every lifecycle transition |
| Timeline | Ordered event collection — appends events, queries by InsightKey |
| Repository | Store, retrieve, and manage the insight lifecycle |
| Contracts | Define interfaces between layers |
| Executive Intelligence Engine | Centralized query facade — single entry point for all consumers |
| Timeline Queries | Reusable event query helpers (first, last, count by type) |
| Event Publisher | Abstract contract for decoupled event distribution |
| Alert Engine | Deterministic event classifier — produces Alert objects (event-based only) |
| Executive Narrative Engine | Transforms structured insight data into factual, traceable narratives |
| Template Provider | Deterministic narrative generation without AI (built-in) |
| Narrative Provider | Abstract contract for text generation (decouples domain from any AI provider) |
| Factuality Guard | Validates output fidelity — no fabricated facts, no inferred causality |
| CopilotExecutiveFacade | Official bridge between Copilot and Intelligence Platform — delegates to Intelligence Engine and Narrative Engine only |
| Executive Copilot | Pure orchestrator — consumes insights, narratives, alerts, and timeline exclusively through CopilotExecutiveFacade |
| Consumers | Render, aggregate, and act on insights (use Intelligence Engine only) |

## Boundaries

- Builders must NOT contain business rules (thresholds, classification logic)
- Builders must NOT call engines directly
- Builders must NOT calculate metrics, growth, margins, or health scores
- Lifecycle Engine must NOT alter severity, priority, evidence, or recommendations
- Lifecycle Engine must NOT call engines, create insights, or calculate metrics
- Repository must NOT contain business logic
- Consumers must NOT modify insight data
- Narrative Engine must NOT access Repository, Timeline, or domain engines
- Narrative Engine must NOT calculate metrics, durations, or classifications
- Narrative Provider must NOT infer causality, create recommendations, or produce unsupported data
- Each builder is responsible for ONE module
- Cross-module correlation happens in a future Correlation Engine

## Builder vs Engine vs Lifecycle Engine

| | Domain Engine | Builder | Lifecycle Engine |
|---|---|---|---|
| Role | Analyze raw data | Map to ExecutiveInsight | Reconcile state |
| Creates | InsightData, etc. | ExecutiveInsight | LifecycleReconciliationResult |
| Can threshold? | Yes | No | No |
| Can calculate? | Yes | No | No |
| Can call AI? | Yes (future) | No | No |
| Can alter lifecycle? | No | Sets initial values | Yes |
| Deterministic | Varies | Always | Always |

## Builder Contract

```ts
interface ExecutiveInsightBuilder<TInput> {
  readonly module: ExecutiveInsightCategory
  build(input: TInput, context: BuilderContext): readonly ExecutiveInsight[]
}

interface BuilderContext {
  refDate: Date
  sourceRunId: string
}
```

- Generic on `TInput` — each module provides its own typed input
- `readonly` return — builders never mutate input or produce side effects
- `module` — each builder is assigned exactly one category

## Lifecycle Engine Contract

```ts
interface LifecycleContext {
  readonly refDate: Date
  readonly sourceRunId: string
}

class ExecutiveInsightLifecycleEngine {
  constructor(repository: ExecutiveInsightRepository, timeline: ExecutiveInsightTimeline)
  reconcile(newInsights: readonly ExecutiveInsight[], context: LifecycleContext): Promise<LifecycleReconciliationResult>
  archive(key: InsightKey, context: LifecycleContext): Promise<ExecutiveInsightDomainEvent>
  reopen(key: InsightKey, context: LifecycleContext): Promise<ExecutiveInsightDomainEvent>
}

interface LifecycleReconciliationResult {
  readonly created: readonly ExecutiveInsight[]    // NEW insights
  readonly activated: readonly ExecutiveInsight[]  // NEW→ACTIVE or RESOLVED→ACTIVE
  readonly updated: readonly ExecutiveInsight[]    // ACTIVE→ACTIVE (re-detected)
  readonly resolved: readonly ExecutiveInsight[]   // ACTIVE→RESOLVED (not detected)
  readonly unchanged: readonly ExecutiveInsight[]  // No state change
  readonly ignored: readonly ExecutiveInsight[]    // ARCHIVED (not modified)
}
```

## InsightKey

InsightKey is a branded string type (`InsightKey = string & { readonly __brand: "InsightKey" }`) that provides semantic identity independent of the technical `id`.

```ts
function buildInsightKey(module: string, content: string): InsightKey
```

Key format: `{module}:insight:{normalized-content}`

Normalization: NFKD Unicode decomposition → stripping of combining diacritical marks → lowercase → non-alphanumeric characters replaced by `-` → truncation to 80 characters.

Content is sourced from the most stable available field per builder type:
- `InsightData`: `fact` (the main insight content text)
- `SalesInsight`: `title` (the insight name)
- Recommendations: `action` (the recommendation text)

No entity identifiers are available in the generic `InsightData` type across all 6 modules. Text content is the best available stable component. Collision risk is low due to 80-char key space and short insight content length.

## Version Semantics

`ExecutiveInsight.version` represents a **mutation counter**:

- Starts at 1 (set by the builder)
- Incremented by the Lifecycle Engine whenever the entity is persisted with any state change (status transition, occurrenceCount update, timestamp update)
- NOT incremented when the insight is ignored (ARCHIVED) or when nothing changed
- NOT incremented on external repository operations (archive, reopen) — the event records the current version at the time of the operation

## Domain Events

Every lifecycle transition produces exactly one `ExecutiveInsightDomainEvent`:

| Event Type | Trigger | Version |
|-----------|---------|---------|
| CREATED | First detection (NEW) | 1 |
| ACTIVATED | NEW→ACTIVE or RESOLVED→ACTIVE | incremented |
| UPDATED | ACTIVE→ACTIVE (re-detected) | incremented |
| RESOLVED | ACTIVE→RESOLVED (not detected) | incremented |
| ARCHIVED | engine.archive() | current version |
| REOPENED | engine.reopen() | current version |

Events are:
- **Immutable** — once appended to the Timeline they are never modified
- **Deterministic** — IDs are composite strings (`{key}:{type}:{version}`), not UUIDs
- **Typed** — `ExecutiveInsightEventType` enum, not loose strings
- **Dated** — timestamps come from `LifecycleContext.refDate`, never `new Date()` or `Date.now()`

## Timeline

The `ExecutiveInsightTimeline` is an ordered event collection (not a UI component):

```ts
interface ExecutiveInsightTimeline {
  append(event: ExecutiveInsightDomainEvent): Promise<void>
  findByKey(key: InsightKey): Promise<readonly ExecutiveInsightDomainEvent[]>
  findAll(): Promise<readonly ExecutiveInsightDomainEvent[]>
}
```

- Events are appended during `reconcile()`, `archive()`, and `reopen()`
- No event is emitted for `ignored` or `unchanged` transitions (no state change)
- The Timeline is a contract — in-memory adapter exists for tests, persistent storage is future

This enables:
- Detection of concurrent modifications
- Optimistic concurrency control in future persistent repositories
- Change tracking for Timeline and audit

## Zero or Multiple Insights

Builders return zero insights when their module has no insights or recommendations. They return multiple when the module has both insights and recommendations. Every insight is deterministic and independently traceable.

## Deterministic Identity

Insight IDs are deterministic, based on module name, entity identifier, and index. No `Math.random()`, `Date.now()`, or `crypto.randomUUID()` inside `build()`. IDs are reproducible for the same input.

## Deterministic Dates

All dates come from explicit context (`BuilderContext.refDate` or `LifecycleContext.refDate`), never from `new Date()` or `Date.now()`. This enables deterministic tests and future scheduler integration.

## Evidence

Evidence follows a typed contract:

```ts
interface InsightEvidence {
  source: string        // module name
  metric?: string       // metric name (e.g., "health", "growth")
  value?: number | string
  previousValue?: number | string
  period?: string
  entityId?: string
  classification?: string
  generatedAt?: string
}
```

Each piece of evidence is traceable back to the input data. No fabricated evidence.

## Severity

Severity is preserved from the source classification:

| Source Classification | ExecutiveInsightSeverity |
|---|---|
| `SalesInsight.type === "success"` | POSITIVE |
| `SalesInsight.type === "warning"` | WARNING |
| `SalesInsight.type === "danger"` | CRITICAL |
| `SalesInsight.type === "info"` | INFO |
| No classification available | INFO (fallback) |

For modules using `InsightData` (marketplace, financial, inventory, products, purchasing), severity is INFO since their insight builders do not produce a native classification. Sales is the only module with native type classification that maps to severity.

## Priority

Priority is never calculated by builders. It remains `0` until Executive Prioritization processes the insight. This avoids duplicate prioritization logic in the builder layer.

## Recommendations

Recommendations are mapped from the module's own `RecommendationData`. Builders do not create independent recommendations. Each existing recommendation produces a separate `ExecutiveInsight` with `classification: "existing_recommendation"` in evidence.

## Prohibited

- No thresholds or magic numbers
- No margin, growth, coverage, or health calculations
- No causal inference ("isso ocorreu porque...")
- No `Math.random()`, `Date.now()`, UUID generation
- No calls to engines, hooks, APIs, or database
- No React imports or `"use client"`
- No implicit date generation — all dates from context
- Narrative Engine: no classification, no calculation, no repository/timeline access
- Narrative Provider: no fabricated data, no inferred causality, no invented recommendations
- Alert Engine: no threshold-based classification, event-based alerts only

## Metadata

The `metadata` field is a generic `Record<string, unknown>` reserved for module-specific data. Examples:

```ts
// Marketplace insight
{ sourceEngine: "marketplace", period: "2026-07", marketplaceId: "ml" }

// Inventory insight
{ analysisVersion: "2.1", productCount: 150, idleCapital: 12450 }
```

No schema validation is applied at the domain level. Consumers validate metadata as needed.

## Archiving Policy

- ARCHIVED insights are never automatically reactivated or modified by the Lifecycle Engine
- Reopening an ARCHIVED insight requires an explicit `engine.reopen()` call
- The engine IGNORES any detected InsightKeys whose existing status is ARCHIVED
- Archive and reopen operations emit ARCHIVED / REOPENED events to the Timeline

## SourceRunId Policy

Every lifecycle evaluation records which source execution produced it via `lastEvaluationRun`. No implicit or auto-generated run identifiers.

## Traceability

Every `ExecutiveInsight` carries:
- `key` — semantic identity (stable across runs)
- `id` — technical identity (for repository operations)
- `lastEvaluationRun` — which sourceRunId last touched it
- `firstDetectedAt` / `lastDetectedAt` — temporal detection range
- `occurrenceCount` — how many times it has been detected

## History

The repository contract supports full history via `findAll()`, `findByStatus()`, `findByModule()`, and `findByKey()`. In-memory and persistent storage implementations will maintain the complete record.

## Future Capabilities (Not Implemented)

- Scheduled insight generation (Scheduler / Cron)
- Persistent storage (SQLite, PostgreSQL, or similar)
- Cross-insight correlation engine
- Insight deduplication and merging
- Visual Timeline of lifecycle events
- External AI narrative provider integration (OpenAI, Claude, Gemini)

## Current Status

Builders implemented for all 6 modules. Lifecycle Engine implemented with full deterministic reconciliation and domain event emission. Domain Events and Timeline contracts defined. Executive Intelligence Engine, Alert Engine (event-based only — no arbitrary thresholds), Timeline Queries, and Event Publisher contracts defined. Executive Narrative Engine implemented with deterministic template provider, factuality guard, and abstract provider contract. CopilotExecutiveFacade implemented — official connection layer between Executive Copilot and Intelligence Platform. Executive Copilot now consumes exclusively from Executive Intelligence Engine and Executive Narrative Engine via the facade. No direct module service access. All infrastructure for executive intelligence is complete (PRs 051–058).

## Module Structure

```
features/executive-insights/
├── domain/
│   ├── events/
│   │   ├── executive-insight-event-type.ts    # Event type enum
│   │   ├── executive-insight-domain-event.ts  # Domain event interface
│   │   └── index.ts
│   ├── executive-insight.ts              # ExecutiveInsight entity
│   ├── insight-evidence.ts               # Evidence contract
│   ├── insight-key.ts                    # InsightKey type + factory
│   └── index.ts
├── timeline/
│   ├── executive-insight-timeline.ts     # Timeline contract
│   └── index.ts
├── types/
│   ├── enums.ts                          # Status, Severity, Category
│   └── index.ts
├── repository/
│   ├── executive-insight-repository.ts   # Repository contract
│   └── index.ts
├── lifecycle/
│   ├── lifecycle-context.ts              # LifecycleContext interface
│   ├── lifecycle-transitions.ts          # Pure transition logic
│   ├── lifecycle-reconciliation-result.ts # Reconciliation result type
│   ├── executive-insight-lifecycle-engine.ts  # Engine service
│   └── index.ts
├── builders/
│   ├── executive-insight-builder.ts      # Generic builder contract
│   ├── marketplace-executive-insight-builder.ts
│   ├── financial-executive-insight-builder.ts
│   ├── inventory-executive-insight-builder.ts
│   ├── sales-executive-insight-builder.ts
│   ├── products-executive-insight-builder.ts
│   ├── purchasing-executive-insight-builder.ts
│   ├── inputs/
│   │   ├── insight-evidence.ts
│   │   ├── marketplace-insight-input.ts
│   │   ├── financial-insight-input.ts
│   │   ├── inventory-insight-input.ts
│   │   ├── sales-insight-input.ts
│   │   ├── products-insight-input.ts
│   │   ├── purchasing-insight-input.ts
│   │   └── index.ts
│   └── index.ts
├── intelligence/
│   ├── executive-insight-intelligence-engine.ts   # Centralized query facade
│   ├── executive-insight-timeline-queries.ts      # Reusable event queries
│   ├── executive-insight-event-publisher.ts       # Publisher contract
│   ├── executive-insight-alert.ts                 # Alert types (event-based only)
│   ├── executive-insight-alert-engine.ts          # Alert classifier
│   └── index.ts
├── narrative/
│   ├── executive-narrative-input.ts               # Input DTO for narrative generation
│   ├── executive-narrative-output.ts              # Typed narrative output
│   ├── executive-narrative-provider.ts            # Abstract provider contract
│   ├── executive-narrative-template-provider.ts   # Deterministic template provider
│   ├── executive-narrative-engine.ts              # Orchestrator with fallback + guard
│   ├── executive-narrative-factuality-guard.ts    # Output fidelity validation
│   ├── executive-narrative-prompt-contract.ts     # Prompt safety contract for LLM
│   └── index.ts
├── copilot/
│   ├── copilot-executive-facade.ts      # Official bridge to Executive Copilot
│   └── index.ts
├── contracts/
│   ├── executive-insight-provider.ts    # Provider contract
│   └── index.ts
├── tests/
│   ├── in-memory-executive-insight-repository.ts        # Test adapter
│   ├── in-memory-executive-insight-timeline.ts          # Timeline test adapter
│   ├── in-memory-executive-insight-event-publisher.ts   # Publisher test adapter
│   ├── executive-insights-platform.test.ts               # Entity + contract tests
│   ├── executive-insight-builders-architecture.test.ts   # Builder architecture tests
│   ├── executive-insight-lifecycle-engine.test.ts         # Lifecycle functional tests
│   ├── executive-insight-lifecycle-architecture.test.ts   # Lifecycle architecture tests
│   ├── executive-insight-timeline.test.ts                  # Timeline functional tests
│   ├── executive-insight-domain-events-architecture.test.ts # Events + Timeline arch tests
│   ├── executive-insight-intelligence-engine.test.ts       # Intelligence functional tests
│   ├── executive-insight-timeline-queries.test.ts          # Timeline queries tests
│   ├── executive-insight-alert-engine.test.ts              # Alert engine tests
│   ├── executive-insight-intelligence-architecture.test.ts # Intelligence arch tests
│   ├── marketplace-executive-insight-builder.test.ts
│   ├── financial-executive-insight-builder.test.ts
│   ├── inventory-executive-insight-builder.test.ts
│   ├── sales-executive-insight-builder.test.ts
│   ├── products-executive-insight-builder.test.ts
│   └── purchasing-executive-insight-builder.test.ts
└── index.ts
```
