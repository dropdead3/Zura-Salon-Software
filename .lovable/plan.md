

# Zura Search Learning System

## Existing Infrastructure Audit

**Already tracking (localStorage):**
- `zura-nav-frequency` — path click counts (unbounded counter, no timestamps)
- `zura-recent-searches` — last 5 query strings (no click association)
- `zura-synonym-telemetry` — last 100 synonym expansions with `hadResults` flag

**Gaps:**
- No query→click pairing (which query led to which result selection)
- No abandonment detection (user typed, got results, closed without clicking)
- No zero-result logging beyond synonym telemetry
- No reformulation chain detection (user types, backspaces, retypes)
- No role/context tagging on any event
- No org-level aggregation — everything is per-browser localStorage
- Frequency map has no decay — a path visited 50 times 6 months ago still dominates
- No mechanism for admin-guided promotions/demotions

## Architecture

```text
src/lib/searchLearning.ts          ← Pure: event logging, signal computation, decay, thresholds
src/hooks/useSearchLearning.ts     ← React hook: tracks session events, feeds into ranking
src/hooks/useSearchRanking.ts      ← Edit: consume learning signals as a secondary scoring layer
```

Two learning levels, stored differently:

| Level | Storage | Scope | Examples |
|-------|---------|-------|---------|
| **User-local** | localStorage | Single browser | Click patterns, recent queries, personal frequency, reformulation chains |
| **Org-wide** | Supabase table | All users in org | Promoted results, admin corrections, aggregate zero-result patterns |

System-wide learnings (cross-org) are explicitly **not built** — they require product team curation and would violate tenant isolation.

## File 1: `src/lib/searchLearning.ts`

### Event Types

```typescript
interface SearchEvent {
  id: string;
  timestamp: number;
  query: string;
  normalizedQuery: string;
  resultCount: number;
  selectedPath: string | null;      // null = abandonment
  selectedRank: number | null;       // position in results (0-indexed)
  selectedType: RankedResultType | null;
  topScore: number | null;
  roleContext: string[];             // effective roles at time of search
  currentPath: string;               // page user was on
  reformulationOf: string | null;    // previous query ID if this is a refinement
  sessionId: string;                 // groups events within one command surface open
}
```

### Storage: `zura-search-events`

Ring buffer of last **500 events** in localStorage. Each event is ~200 bytes → ~100KB max.

### Computed Signals

**1. Query→Path Affinity (QPA)**
For a given query, which paths are most frequently selected?

```typescript
function getQueryPathAffinity(query: string): Map<string, number>
// Returns path → selection count for queries that normalize to the same form
// Normalization: lowercase, trim, collapse whitespace
```

Threshold: Only surfaces if a query→path pair has ≥3 selections. Below that, signal is suppressed.

**2. Abandonment Rate**
For queries that produced results but user closed without selecting — tracks per normalized query.

```typescript
function getAbandonmentRate(query: string): number  // 0-1
```

High abandonment (>0.6 over ≥5 occurrences) flags a query as "poorly served" for observability.

**3. Reformulation Chain Detection**
If user types "payrol", backspaces, types "payroll" within the same session, these are linked. Reformulation chains where the final query succeeds suggest the intermediate queries need better synonym/typo coverage.

Detection: Two queries in the same sessionId where the second starts within 10 seconds of the first and shares ≥60% character overlap.

**4. Zero-Result Queries**
Queries that returned 0 results or all results scored <0.3. Logged separately for observability.

```typescript
function getZeroResultQueries(): { query: string; count: number; lastSeen: number }[]
```

**5. Time-Decayed Frequency**
Replace the existing unbounded counter with a decayed model:

```typescript
function getDecayedFrequency(path: string): number
// Each visit decays by 0.95^(days since visit)
// Recent visits matter more than ancient ones
```

Storage change: `zura-nav-frequency` switches from `{path: count}` to `{path: timestamp[]}` (last 30 timestamps per path, ~50 paths max).

### Ranking Boost Computation

```typescript
interface LearningBoost {
  queryPathBoost: number;    // 0-0.15 based on QPA
  decayedFrequency: number;  // replaces existing frequency signal
}

function computeLearningBoosts(
  query: string,
  candidatePath: string,
  events: SearchEvent[],
): LearningBoost
```

**Boost caps (hard limits):**
- `queryPathBoost`: max 0.15 — never exceeds intent alignment or text match weight
- Learning boosts combined never exceed 0.20 of total score
- Exact match override (score = 1.0) is never affected by learning

### Decay & Garbage Collection

- Events older than 90 days are pruned on read
- Frequency timestamps older than 60 days are pruned
- GC runs on first hook mount per session, max once per hour

## File 2: `src/hooks/useSearchLearning.ts`

React hook that:
1. Generates a `sessionId` when command surface opens
2. Tracks each keystroke debounced (captures the final query, not intermediates)
3. On result selection → logs SearchEvent with selected path/rank
4. On surface close without selection → logs abandonment event
5. Detects reformulation chains within the session
6. Exposes `learningBoosts` for the ranking hook to consume

```typescript
export function useSearchLearning(open: boolean) → {
  sessionId: string;
  logSelection(query: string, path: string, rank: number, type: RankedResultType, resultCount: number, topScore: number): void;
  logAbandonment(query: string, resultCount: number): void;
  getLearningBoosts(query: string, candidatePath: string): LearningBoost;
  getDecayedFrequencyMap(): Record<string, number>;
}
```

## File 3: `src/hooks/useSearchRanking.ts` — Integration

Minimal change: replace `getFrequencyMap()` call with `getDecayedFrequencyMap()` from learning hook. Add `queryPathBoost` as an additive term after `computeScore()`.

```typescript
// In ranking memo:
const learningBoost = learning.getLearningBoosts(query, candidate.path);
const baseScore = computeScore(signals);
const finalScore = isExact ? 1.0 : Math.min(baseScore + learningBoost.queryPathBoost, 0.99);
```

The 0.99 cap ensures learned boosts never equal an exact match.

## File 4: `src/components/command-surface/ZuraCommandSurface.tsx` — Integration

Wire learning hook:
- On `handleSelect` → call `logSelection()`
- On surface close with query but no selection → call `logAbandonment()`
- Pass `getDecayedFrequencyMap` to ranking hook

## Database: Org-Wide Promotions Table

Migration for admin-guided corrections (architecture now, admin UI later):

```sql
CREATE TABLE public.search_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  query_pattern TEXT NOT NULL,         -- normalized query or wildcard
  promoted_path TEXT NOT NULL,         -- path to boost
  boost_amount NUMERIC DEFAULT 0.10,  -- 0.05 to 0.20
  demoted BOOLEAN DEFAULT FALSE,      -- if true, penalize instead
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,             -- optional TTL
  UNIQUE (organization_id, query_pattern, promoted_path)
);

ALTER TABLE public.search_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins manage promotions"
  ON public.search_promotions FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org members read promotions"
  ON public.search_promotions FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
```

The ranking hook will query this table (cached, 5min staleTime) and apply boosts/demotions before final sort.

## Observability

New export in `searchLearning.ts`:

```typescript
function getSearchHealthReport(): {
  totalEvents: number;
  uniqueQueries: number;
  zeroResultQueries: { query: string; count: number }[];
  highAbandonmentQueries: { query: string; rate: number; count: number }[];
  topQueryPathPairs: { query: string; path: string; count: number }[];
  reformulationChains: { original: string; final: string; count: number }[];
}
```

Accessible via browser console: `window.__zuraSearchHealth()` in dev mode. No UI yet.

## Safety & Boundaries

| Risk | Mitigation |
|------|-----------|
| Learning overrides exact match | Hard rule: exact match = 1.0, never modified |
| Runaway boost accumulation | All learning boosts capped at 0.15 per signal, 0.20 combined |
| Stale learning from old behavior | 90-day event expiry, 60-day frequency decay |
| Cross-org data leakage | User-local in localStorage (browser-bound), org promotions scoped by org_id with RLS |
| Permission bypass via learning | Permission pre-filter runs BEFORE any scoring — learning cannot surface unpermitted results |
| Noisy reactions to sparse data | Minimum 3 occurrences before QPA activates, 5 occurrences before abandonment flags |
| Inconsistent UX across users | Learning only provides secondary boosts; primary ranking logic is deterministic and shared |
| Irreversible drift | All learning is derived from purgeable event logs; clearing localStorage resets user-local learning completely |

## Examples

**Search improves over time:**
1. User searches "schedule" 8 times, always clicks Schedule page → QPA boost pushes Schedule to definitive #1 even when other results score close
2. User searches "money" 5 times, never clicks anything → flagged as high-abandonment → observability report surfaces this → product team adds better concept cluster mapping
3. Admin promotes "/dashboard/admin/sales" for query "numbers" → all org users see Sales Analytics boosted for that query

**Learning does NOT destabilize:**
- New user with no history → zero learning boosts → pure deterministic ranking
- User who clears browser data → learning resets → deterministic baseline
- Admin removes a promotion → boost disappears immediately on next query

## Files Summary

| File | Action |
|------|--------|
| `src/lib/searchLearning.ts` | Create — event logging, signal computation, decay, health report |
| `src/hooks/useSearchLearning.ts` | Create — React lifecycle hook for tracking + boost computation |
| `src/hooks/useSearchRanking.ts` | Edit — consume learning boosts, replace raw frequency with decayed |
| `src/components/command-surface/ZuraCommandSurface.tsx` | Edit — wire selection/abandonment logging |
| Migration: `search_promotions` table | Create — org-level admin corrections |

No parser modifications. No ranker logic changes. No synonym system modifications.

