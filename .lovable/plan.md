

# Multi-Query Chaining Engine

## What Exists Today

The parser already extracts **individual** dimensions well — time context, action intent, filters (no_show, top, new_clients), metric words, and entity candidates — but treats them as flat, independent outputs. There is no structured relationship model between parts. For "Brooklyn retail last 30 days," the parser produces:
- `timeContext: { value: '30d' }` 
- Token "retail" → type `metric`
- Token "Brooklyn" → type `unknown` → becomes `entity_candidate`
- No `locationScope`, no `subjectType`, no structured chain linking retail-metric-to-Brooklyn-entity

The ranker receives these flat signals and does text matching against candidate titles. It cannot construct a parameterized destination like `/dashboard/admin/sales?location=brooklyn&category=retail&period=30d`.

## Architecture

One new file — a **post-parser chain assembler** that consumes `ParsedQuery` output and produces a structured `ChainedQuery` with explicitly typed slots. This does not modify the parser. It layers on top.

```text
src/lib/queryChainEngine.ts   ← Chain assembly, slot extraction, destination generation
src/hooks/useSearchRanking.ts ← Edit: consume ChainedQuery for destination-aware ranking
```

## ChainedQuery Schema

```typescript
interface ChainedQuery {
  raw: string;
  
  // Structured slots (all optional)
  subject: ChainSlot | null;        // "Brooklyn", "Ashley", "color clients"
  topic: ChainSlot | null;          // "retail", "refunds", "appointments" 
  timeRange: TimeContext | null;     // reused from parser
  locationScope: ChainSlot | null;  // "Gilbert", "Brooklyn" (when resolved as location)
  rankingModifier: RankingModifier | null;  // "top", "lowest", "newest"
  negativeFilter: NegativeFilter | null;    // "no bookings", "no rebook", "no visit"
  actionVerb: ActionIntent | null;   // reused from parser
  limit: number | null;              // "top 10" → 10
  
  // Resolution
  subjectType: 'stylist' | 'client' | 'location' | 'service' | 'unknown' | null;
  destinationHint: DestinationHint | null;
  confidence: number;
}

interface ChainSlot {
  value: string;
  source: 'token' | 'alias' | 'inferred';
  confidence: number;
}

interface NegativeFilter {
  type: 'no_bookings' | 'no_rebook' | 'no_visit' | 'no_show' | 'no_retail';
  daysThreshold?: number;  // "no bookings 60 days" → 60
}

interface RankingModifier {
  direction: 'top' | 'bottom' | 'newest' | 'oldest' | 'highest' | 'lowest';
}

interface DestinationHint {
  path: string;
  params: Record<string, string>;
  label: string;
  confidence: number;
}
```

## Chain Assembly Logic

`assembleChain(parsed: ParsedQuery, locationNames: string[]): ChainedQuery`

Steps (executed in order on the parser's token array):

1. **Negative filter extraction** — Scan for "no" + noun patterns not already caught by FILTER_PHRASES. New patterns: `no bookings`, `no rebook`, `no visit`, `no retail`, `no color`. Optional trailing number+days: "no bookings 60 days".

2. **Ranking modifier extraction** — Beyond existing `top`/`bottom` filters, recognize: `highest`, `lowest`, `newest`, `oldest`, `best`, `worst`, `underperforming`.

3. **Location scope resolution** — Check remaining unknown tokens against the provided `locationNames` array (from `useActiveLocations`). If a token matches a location name (case-insensitive, substring for multi-word locations), classify it as `locationScope` rather than entity. This resolves the Brooklyn/Gilbert ambiguity.

4. **Topic classification** — Metric tokens plus synonym-expanded terms get classified into topic families: `retail`, `service_revenue`, `appointments`, `refunds`, `cancellations`, `utilization`, `retention`, `commission`, `color`. These map to specific analytics routes.

5. **Subject type inference** — If a remaining entity candidate is NOT a location and NOT a topic keyword, infer subject type from context:
   - Adjacent to "clients" token → `subjectType = 'client'`
   - Adjacent to metric/topic → `subjectType = 'stylist'` (name + metric = staff analytics)
   - Capitalized unknown with no other context → `subjectType = 'stylist'` (default for proper nouns)
   - "clients" token present with filters → `subjectType = 'client'` (aggregate)

6. **Destination hint generation** — Map the assembled chain to a parameterized route:

| Pattern | Destination |
|---------|-------------|
| topic=retail + time | `/dashboard/admin/sales?tab=retail&period={time}` |
| topic=refunds + time | `/dashboard/appointments-hub?tab=refunds&period={time}` |
| subject(stylist) + topic | `/dashboard/admin/staff-utilization?search={name}` |
| negativeFilter=no_rebook + subjectType=client | `/dashboard/admin/reengagement?filter=no_rebook` |
| rankingModifier=top + subjectType=client | `/dashboard/clients?sort=spend&dir=desc` |
| topic=utilization + rankingModifier=underperforming | `/dashboard/admin/staff-utilization?filter=low` |
| locationScope + topic | Route with `?location={id}` appended |

## Precedence Rules (Ambiguity Resolution)

1. **Location over entity** — If a token matches a known location name, it is always classified as `locationScope`, never as a person name. Reason: location names are finite and known; person lookup is always available as a secondary result.

2. **Metric over navigation** — If a query has both metric tokens AND time context, treat as `analytics_query` chain even if a nav word is present. "Sales last 30 days" → analytics, not nav to Sales page.

3. **Negative filter consumes adjacent tokens** — "no bookings 60 days" consumes 4 tokens as one unit. The "60" and "days" are not treated as separate time context.

4. **Action verb takes highest priority** — If an action verb is detected, the chain is action-first. Other slots become action parameters, not standalone dimensions.

5. **Single-token queries skip chaining** — Queries with ≤1 remaining token after time/filter extraction use existing simple matching. Chaining only activates for multi-dimensional queries (2+ classified slots).

## Integration into Ranking

In `useSearchRanking.ts`:

```typescript
const chained = useMemo(() => {
  if (!parsed) return null;
  return assembleChain(parsed, locationNames);
}, [parsed, locationNames]);
```

The `destinationHint` from chaining becomes a **virtual candidate** injected into the candidate pool with type `'navigation'` and high intent alignment. This ensures multi-part queries surface a direct "Go to X filtered by Y" result at rank #1.

Additionally, the chain's `subjectType` disambiguates entity resolution — if chaining determines the unknown token is a location, the entity resolver skips stylist matching for that token.

## Phase 1 Scope

Supported:
- Entity + metric + time ("Brooklyn retail last 30 days")
- Ranking modifier + entity type + filter ("top clients no bookings 60 days")  
- Topic + time + location ("refunds this week Gilbert")
- Service/topic + entity type + negative filter ("color clients with no rebook")
- Ranking modifier + entity type + time ("underperforming stylists this month")

Deferred (Phase 2+):
- Multi-entity chains ("Ashley vs Jordan retention")
- Compound actions ("book and charge Sarah")
- Cross-module joins ("clients who bought retail but didn't rebook")
- Natural language math ("revenue minus refunds this month")

## Negative Filter Vocabulary

```typescript
const NEGATIVE_FILTERS: { phrases: string[]; type: NegativeFilter['type'] }[] = [
  { phrases: ['no bookings', 'no booking', 'no appointments', 'not booked'], type: 'no_bookings' },
  { phrases: ['no rebook', 'no rebooking', 'didn\'t rebook', 'not rebooked'], type: 'no_rebook' },
  { phrases: ['no visit', 'no visits', 'haven\'t visited', 'not visited'], type: 'no_visit' },
  { phrases: ['no show', 'no shows', 'no-show'], type: 'no_show' },
  { phrases: ['no retail', 'no product', 'no products'], type: 'no_retail' },
];
```

## Failure Fallback

If chain assembly produces `confidence < 0.4` or no `destinationHint`, the system falls back to standard flat ranking (existing behavior). Chaining never degrades existing search — it only adds structured results when confident.

## Tests

New file `src/lib/__tests__/queryChainEngine.test.ts`:
- "Brooklyn retail last 30 days" → locationScope=Brooklyn, topic=retail, time=30d, destination hint to sales
- "top clients no bookings 60 days" → rankingModifier=top, subjectType=client, negativeFilter=no_bookings(60), no time context consumed by negative filter
- "refunds this week Gilbert" → topic=refunds, time=thisWeek, locationScope=Gilbert
- "color clients with no rebook" → topic=color, subjectType=client, negativeFilter=no_rebook
- "underperforming stylists this month" → rankingModifier=underperforming, subjectType=stylist, time=thisMonth
- Single-word "revenue" → no chaining, falls through to standard ranking
- Unknown gibberish "xyzabc foo bar" → low confidence, no destination hint, fallback

## Self-Audit

**Reliability**: Chain assembly is deterministic — same ordered slot extraction every time. No ML, no probabilistic interpretation.

**Debuggability**: `ChainedQuery` is a plain object with named slots. Every decision (why Brooklyn = location, not entity) is traceable through the slot extraction order.

**Ambiguity handling**: Location-first precedence rule handles the most common ambiguity (proper noun = person vs place). Remaining ambiguity produces both a chained destination AND standard entity results — user picks.

**Scope control**: Phase 1 covers 5 common pattern classes. Single-token queries bypass chaining entirely. Confidence threshold prevents low-quality chain results from polluting search.

**Performance**: Chain assembly is O(tokens × locations) — locations are typically <20, tokens <10. Sub-millisecond.

## Files Summary

| File | Action |
|------|--------|
| `src/lib/queryChainEngine.ts` | Create — chain assembly, slot extraction, destination hints |
| `src/hooks/useSearchRanking.ts` | Edit — consume chained query, inject destination candidates |
| `src/lib/__tests__/queryChainEngine.test.ts` | Create — comprehensive tests |

No database changes. No parser modifications. No ranker modifications.

