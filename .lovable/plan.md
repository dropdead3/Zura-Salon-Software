

# Zura Search Ranking Engine

## What Exists Today

The current `useCommandSearch.ts` uses a simple `scoreMatch()` (substring/starts-with scoring) directly against labels, then sorts by raw text score. There is no intent alignment, no frequency/recency signals, no role relevance, and no context boosting. The `commandTypes.ts` already has `groupResults()` that pulls top-2 into "Best Match" and groups the rest by type. The `parseQuery()` engine produces structured intents, entities, filters, time context, and confidence scores. The `useQueryEntityResolver` resolves entity candidates against live data.

## Architecture

Two new files. No modifications to the parser, resolver, or existing UI components.

```text
src/lib/searchRanker.ts          ← Pure scoring + grouping engine
src/hooks/useSearchRanking.ts    ← React hook that wires parser → resolver → ranker
```

The existing `useCommandSearch` and `commandTypes.groupResults` remain untouched. The new hook replaces the consumption point in `ZuraCommandSurface.tsx` — one import swap.

## File 1: `src/lib/searchRanker.ts`

### Types

```typescript
export interface RankedResult {
  id: string;
  type: 'navigation' | 'team' | 'client' | 'help' | 'action' | 'report' | 'utility';
  title: string;
  subtitle?: string;
  path?: string;
  icon?: React.ReactNode;
  metadata?: string;
  score: number;
  signals: RelevanceSignals;
}

export interface RelevanceSignals {
  textMatch: number;       // 0-1, from scoreMatch normalized
  intentAlignment: number; // 0-1, how well result type matches top intent
  entityConfidence: number;// 0-1, from resolved entity confidence
  recency: number;         // 0-1, recent search/view boost
  frequency: number;       // 0-1, access frequency boost
  roleRelevance: number;   // 0-1, permission/role alignment
  contextBoost: number;    // 0-1, current route proximity
}

export interface RankedResultGroup {
  id: string;
  label: string;
  results: RankedResult[];
}

export interface SuggestionFallback {
  type: 'topic' | 'navigation' | 'query_correction';
  label: string;
  path?: string;
  query?: string;
}
```

### Scoring Formula

```typescript
const WEIGHTS = {
  textMatch:       0.25,
  intentAlignment: 0.25,
  entityConfidence: 0.15,
  recency:         0.10,
  frequency:       0.10,
  roleRelevance:   0.10,
  contextBoost:    0.05,
};

function computeScore(signals: RelevanceSignals): number {
  return Object.entries(WEIGHTS).reduce(
    (sum, [key, weight]) => sum + (signals[key] ?? 0) * weight, 0
  );
}
```

**Weight justification:**
- `textMatch` (0.25): Direct relevance — exact match must dominate
- `intentAlignment` (0.25): A "team" result should rank higher when intent is `entity_lookup` vs `navigation`
- `entityConfidence` (0.15): Resolved entities (confirmed stylist match) get meaningful lift
- `recency` (0.10): Recently searched/viewed items surface faster on repeat access
- `frequency` (0.10): Frequently accessed pages earn a steady boost
- `roleRelevance` (0.10): Admins see admin pages higher; stylists see their tools higher
- `contextBoost` (0.05): If user is already on `/dashboard/admin/sales`, related analytics pages get a small nudge

### Signal Computation

**textMatch**: Reuse `scoreMatch()` pattern, normalize to 0-1 by dividing by 100.

**intentAlignment**: Map result types to intent types. If the top parsed intent is `entity_lookup` and the result type is `team`, score = top intent confidence. If misaligned (e.g., intent is `navigation` but result is `team`), score = 0.1.

```typescript
const INTENT_TYPE_MAP: Record<IntentType, ResultType[]> = {
  entity_lookup:   ['team', 'client'],
  navigation:      ['navigation', 'utility', 'report'],
  analytics_query: ['report', 'navigation'],
  action_request:  ['action'],
  help_query:      ['help'],
  ambiguous:       [], // no boost
};
```

**entityConfidence**: If result corresponds to a resolved entity (matched by `resolvedId`), use that entity's confidence. Otherwise 0.

**recency**: Check result path against `recentSearches` list (from `useRecentSearches`). Position-weighted: first recent = 1.0, second = 0.8, etc., decaying by 0.2.

**frequency**: Check result path against a frequency map stored in localStorage (incremented on each navigation). Normalize: `min(count / 20, 1)`.

**roleRelevance**: If the result's `permission` or `roles` field intersects with the user's effective permissions/roles, score = 1.0. If no permission is required, score = 0.5 (neutral). If permission exists but user doesn't have it — result is filtered out entirely (pre-ranking).

**contextBoost**: Compare current `location.pathname` prefix with result path. Shared prefix segments = boost: 1 segment = 0.3, 2+ segments = 0.6, exact match = 0.

### Hard Rules

1. **Exact match override**: If `textMatch === 1.0` (exact title match), force score to 1.0 regardless of other signals.
2. **Permission filtering before ranking**: Results requiring permissions the user lacks are excluded before scoring begins.
3. **No AI in scoring**: All signal computation is arithmetic over pre-computed values.
4. **Deterministic ordering**: Ties broken by alphabetical title, then by result type priority.

### Result Grouping

```typescript
const GROUP_CONFIG = {
  best:       { label: 'Top Results', priority: 0, maxItems: 3 },
  team:       { label: 'Team', priority: 1 },
  client:     { label: 'Clients', priority: 2 },
  navigation: { label: 'Pages & Features', priority: 3 },
  report:     { label: 'Reports', priority: 4 },
  utility:    { label: 'Utilities', priority: 5 },
  help:       { label: 'Help & Resources', priority: 6 },
  action:     { label: 'Suggested Actions', priority: 7 },
};
```

- Top Results: highest 2-3 scores across all groups (only if score > 0.4 threshold)
- Remaining results grouped by type, sorted by score within each group
- Groups with 0 results omitted
- Cap total results at 15

### Ambiguity Handling

If the parser's `intentClarity` is below 0.2 (multiple strong intents), surface results from all matching intent categories rather than collapsing. The "Top Results" group may contain mixed types — this is intentional for ambiguous queries like "Ashley" (could be team, client, or page).

### Suggestion Generation

When no results score above 0.3 or result count is 0:

```typescript
function generateSuggestions(parsed: ParsedQuery, currentPath: string): SuggestionFallback[]
```

- If `help_query` intent is present: suggest "Browse Help Center" and "Ask AI"
- If `navigation` intent: suggest 3 closest nav label matches by edit distance
- If `entity_lookup`: suggest "Search Team Directory" and "Search Clients"
- Always include: nearby pages based on current route context

## File 2: `src/hooks/useSearchRanking.ts`

React hook that orchestrates the full pipeline:

```typescript
export function useSearchRanking(
  query: string,
  options: {
    filterNavItems?: (items: NavItem[]) => NavItem[];
    permissions?: string[];
    roles?: string[];
    currentPath?: string;
  }
): {
  rankedResults: RankedResult[];
  groups: RankedResultGroup[];
  suggestions: SuggestionFallback[];
  parsedQuery: ParsedQuery | null;
  isAmbiguous: boolean;
}
```

Pipeline:
1. `parseQuery(query)` — from `queryParser.ts`
2. `useQueryEntityResolver(parsed)` — resolve entities
3. Generate candidate results from nav items + team + help (reuse existing data sources from `useCommandSearch`)
4. Filter by permissions
5. Score each candidate via `rankResults()`
6. Group via `groupRankedResults()`
7. Generate suggestions if needed

### Frequency Tracking

A helper within the hook manages `localStorage` frequency counts:
- Key: `zura-nav-frequency`
- Value: `Record<string, number>` (path → access count)
- Incremented when `handleSelect` is called (via exposed `trackNavigation` callback)
- Read during scoring

## Integration Point

In `ZuraCommandSurface.tsx`, replace:
```typescript
const { results } = useCommandSearch(query, { filterNavItems });
```
with:
```typescript
const { groups, suggestions, parsedQuery, isAmbiguous } = useSearchRanking(query, {
  filterNavItems, permissions, roles, currentPath: location.pathname,
});
```

This is a single import swap. The `CommandResultPanel` already accepts grouped results — it will consume the new `groups` format with minimal adaptation (type alignment).

## Ranking Examples

**"Ashley"** (ambiguous — name could be team or client):
- Top Results: Ashley (Team, score 0.82), Ashley (Client, score 0.78)
- Team group: Ashley's full profile link
- Ambiguity preserved — both paths visible

**"sales report last month"** (analytics intent):
- Top Results: Sales Analytics (navigation, score 0.91 — strong text + intent alignment)
- Reports group: Reports page (score 0.65)
- Intent alignment boosts navigation results matching `analytics_query`

**"settings"** (exact navigation match):
- Top Results: Settings (score 1.0 — exact match override)

**No match — "xyzabc"**:
- Suggestions: "Browse Help Center", "View All Pages", "Ask AI"

## Performance

- `parseQuery()` is ~0.5ms (pure string ops)
- Scoring loop is O(n) over candidates (typically <100 items)
- `useMemo` dependencies: `[query, teamMembers, permissions, currentPath]`
- No network calls in the ranking path
- Total ranking time target: <5ms

## Files Summary

| File | Purpose |
|------|--------|
| `src/lib/searchRanker.ts` | Pure scoring engine + grouping + suggestions |
| `src/hooks/useSearchRanking.ts` | React hook orchestrating parser → resolver → ranker |
| `src/components/command-surface/ZuraCommandSurface.tsx` | Minor: swap `useCommandSearch` for `useSearchRanking` |

No database changes. No edge functions. No parser modifications.

