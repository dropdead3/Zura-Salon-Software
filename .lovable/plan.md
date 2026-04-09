

# Zura Query Parsing Engine

## Audit Summary

**Existing logic to reuse (not duplicate):**
- `scoreMatch()` in `useCommandSearch.ts` — basic substring/word-boundary scoring
- `isQuestionQuery()` in `commandTypes.ts` — question prefix detection (16 prefixes)
- `DATE_RANGE_LABELS` + `DateRangeType` in `dateRangeLabels.ts` — canonical time range vocabulary
- `AVAILABLE_METRICS` in `reportMetrics.ts` — metric/category vocabulary (revenue, operations, clients, staff)
- `AVAILABLE_DIMENSIONS` in `reportMetrics.ts` — dimension vocabulary (date, location, stylist, service_category)
- `useServiceLookup` — service name → category map from `phorest_services`
- `useProductLookup` — barcode/SKU/name product resolution
- `useTeamDirectory` — team member name resolution
- Navigation registries in `dashboardNav.ts` — all route labels and paths

**No existing NLP, tokenization, entity extraction, or filter parsing.** The current search is purely substring matching against static labels. This engine is net-new infrastructure.

## Architecture

One new file: `src/lib/queryParser.ts` — pure functions, no React hooks, no side effects, no API calls. Entity resolution against live data happens in a separate hook that consumes the parser output.

```text
Raw Input
    │
    ▼
┌─────────────┐
│ tokenize()  │  Split into semantic tokens
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ classifyIntents()│  Score intent types
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ extractTime()    │  Detect and normalize time phrases
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ extractFilters() │  Detect structured filter patterns
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ detectAction()   │  Detect action verbs + targets
└──────┬───────────┘
       │
       ▼
┌──────────────────────┐
│ parseQuery()         │  Orchestrator — returns ParsedQuery
└──────────────────────┘

Second file: src/hooks/useQueryEntityResolver.ts
  — Takes ParsedQuery + live data (team, services, nav items)
  — Resolves entity candidates against real records with fuzzy matching
  — Returns ResolvedQuery with matched entities
```

## File 1: `src/lib/queryParser.ts`

### Types

```typescript
interface ParsedQuery {
  raw: string;
  tokens: Token[];
  intents: ScoredIntent[];
  entities: EntityCandidate[];
  filters: Record<string, any>;
  timeContext: TimeContext | null;
  actionIntent: ActionIntent | null;
  confidence: {
    overall: number;
    intentClarity: number;
    entityResolution: number;
    timeResolution: number;
  };
  remainingTokens: string[]; // unclassified tokens for entity resolution
}

interface Token {
  raw: string;
  normalized: string;
  type: 'time' | 'action' | 'filter' | 'metric' | 'entity_candidate' | 'unknown';
  startIndex: number;
}

interface ScoredIntent {
  type: 'entity_lookup' | 'navigation' | 'analytics_query'
      | 'action_request' | 'help_query' | 'ambiguous';
  confidence: number;
}

interface EntityCandidate {
  type: 'client' | 'stylist' | 'service' | 'product' | 'transaction' | 'page';
  value: string;
  confidence: number;
}

interface TimeContext {
  type: 'relative' | 'absolute';
  value: string;           // canonical key: 'today', '7d', 'lastMonth', etc.
  label: string;           // human-readable
  startDate: string;       // ISO date
  endDate: string;         // ISO date
}

interface ActionIntent {
  type: string;            // 'create_client', 'refund', 'message', 'book', etc.
  target?: string;         // extracted target noun
  confidence: number;
}
```

### Step 1 — Tokenization

- Greedy multi-word match against time phrase dictionary first (consumes "last 30 days" as one token before splitting)
- Then split remaining text on whitespace
- Normalize: lowercase, trim punctuation
- Tag each token with initial type guess based on vocabulary membership

**Time phrase dictionary** — imports and extends `DATE_RANGE_LABELS` keys:
```
"today", "yesterday", "last week", "this week", "last month",
"this month", "last 7 days", "last 30 days", "last 90 days",
"year to date", "ytd", "last year", "q1", "q2", "q3", "q4"
```

**Action verb dictionary:**
```
"add", "create", "new", "book", "schedule", "cancel", "refund",
"message", "text", "email", "send", "edit", "update", "delete",
"remove", "assign", "transfer", "check in", "clock in", "clock out"
```

**Metric vocabulary** — derived from `AVAILABLE_METRICS` labels and categories:
```
"revenue", "sales", "retail", "service", "appointments", "no shows",
"cancellations", "utilization", "retention", "rebooking", "ticket"
```

**Filter keyword dictionary:**
```
"no show", "cancelled", "new client", "returning", "top", "bottom",
"active", "inactive", "overdue", "pending"
```

### Step 2 — Intent Classification

Score each intent type based on token composition (deterministic rules, no AI):

| Signal | Intent | Score boost |
|--------|--------|-------------|
| Question prefix detected (`isQuestionQuery`) | `help_query` | +0.7 |
| Action verb present | `action_request` | +0.6 |
| Metric/analytics token present | `analytics_query` | +0.5 |
| Time context + metric | `analytics_query` | +0.3 |
| Navigation label substring match | `navigation` | +0.6 |
| Remaining unclassified tokens (name-like) | `entity_lookup` | +0.4 |
| Mixed signals, no dominant | `ambiguous` | base 0.3 |

Return all intents sorted by confidence descending. Multiple can score above threshold.

### Step 3 — Time Context Extraction

- Match against time phrase dictionary (greedy, longest match first)
- Resolve to actual dates using `date-fns` (reuse same logic patterns as `dateRangeLabels.ts`)
- Remove matched tokens from remaining pool
- Return `TimeContext` with canonical key, label, and computed date range

### Step 4 — Filter Extraction

Pattern matching against filter dictionary + adjacent modifiers:
- `"no shows"` → `{ status: 'no_show' }`
- `"inactive 60 days"` / `"no visits 60 days"` → `{ inactivity_days: 60 }`
- `"top clients"` / `"top 10"` → `{ rank: 'top', limit: 10 }`
- `"new clients"` → `{ client_type: 'new' }`
- Number adjacent to filter keyword consumed as parameter

### Step 5 — Action Intent Detection

- Match first action verb token
- Next unclassified token becomes the target
- Map to canonical action types: `create_client`, `book_appointment`, `send_message`, `process_refund`, etc.
- Confidence based on verb clarity (exact match = 0.9, partial = 0.6)

### Step 6 — Entity Candidates

Remaining unclassified tokens after time/filter/action extraction become entity candidates. The parser does NOT resolve them against live data — it marks them as candidates with type hints:
- If query context includes metric tokens → candidate is likely a stylist/location
- If action is `message` or `book` → candidate is likely a person
- Default: `entity_candidate` with `confidence: 0.5`, resolved later by the hook

### Step 7 — Confidence Model

```typescript
confidence = {
  overall: weighted average of all dimension confidences,
  intentClarity: max intent score - second intent score (higher = less ambiguous),
  entityResolution: 0 until resolver runs (updated by hook),
  timeResolution: 1.0 if time matched, 0 if no time context
}
```

## File 2: `src/hooks/useQueryEntityResolver.ts`

React hook that takes `ParsedQuery` + existing data hooks and resolves entity candidates:

- Consumes `useTeamDirectory()` for stylist name matching (reuse existing `scoreMatch`)
- Consumes navigation registry for page matching
- Consumes `useServiceLookup()` for service name matching
- Returns `ResolvedQuery` with entities upgraded from candidates to confirmed matches with confidence scores
- Applies fuzzy matching: exact > starts-with > contains > word-boundary (reuses `scoreMatch` pattern)

## Example Inputs → Outputs

**"Brooklyn retail last 30 days"**
```
tokens: ["Brooklyn", "retail", "last 30 days"]
intents: [{ analytics_query: 0.75 }, { entity_lookup: 0.55 }]
entities: [{ type: "stylist", value: "Brooklyn", confidence: 0.5 }]
filters: {}
timeContext: { type: "relative", value: "30d", startDate: "...", endDate: "..." }
remainingTokens: ["Brooklyn"]  // → resolver matches to team member
```

**"add client"**
```
tokens: ["add", "client"]
intents: [{ action_request: 0.9 }]
actionIntent: { type: "create_client", confidence: 0.9 }
```

**"no shows last week"**
```
tokens: ["no shows", "last week"]
intents: [{ analytics_query: 0.7 }]
filters: { status: "no_show" }
timeContext: { type: "relative", value: "thisWeek", ... }
```

**"how do refunds work"**
```
intents: [{ help_query: 0.85 }]
```

## Edge Cases

- Empty / whitespace-only → returns empty ParsedQuery with `overall: 0`
- Single character → suppresses parsing, returns raw only
- Pure number → treated as entity candidate (could be transaction ID)
- Mixed intent ("Ashley appointments last month") → multi-intent with `entity_lookup` + `analytics_query` both scoring high

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/queryParser.ts` | Pure parsing engine (all 7 steps) |
| `src/hooks/useQueryEntityResolver.ts` | React hook for live entity resolution |
| `src/lib/__tests__/queryParser.test.ts` | Unit tests for parser edge cases |

## Files Reused (Not Modified)

| File | What's consumed |
|------|----------------|
| `src/lib/dateRangeLabels.ts` | `DateRangeType`, date-fns patterns |
| `src/lib/reportMetrics.ts` | `AVAILABLE_METRICS` labels for vocabulary |
| `src/components/command-surface/commandTypes.ts` | `isQuestionQuery()` |
| `src/components/command-surface/useCommandSearch.ts` | `scoreMatch()` pattern (replicated, not imported — it's not exported) |
| `src/hooks/useEmployeeProfile.ts` | `useTeamDirectory()` |
| `src/hooks/useServiceLookup.ts` | `useServiceLookup()` |
| `src/config/dashboardNav.ts` | Navigation registries |

No database changes. No UI changes. No edge functions.

