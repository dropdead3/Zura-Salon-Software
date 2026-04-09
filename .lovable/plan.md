

# Zura Search Command Layer — Unification, Hardening & Polish

## Audit Summary

After reviewing all 12 core files across the search stack, I identified **14 actionable gaps** across coherence, safety, performance, and UX. The stack is well-architected — the subsystems compose cleanly — but there are integration seams, a critical routing issue, redundant code paths, and several UX dead ends.

## Critical Gaps Found

### 1. Route Mismatch — Org-Scoped Paths (HIGH SEVERITY)

All nav items in `dashboardNav.ts` use `/dashboard/*` paths. The app actually routes via `/org/:orgSlug/dashboard/*`. When a user selects a search result, `navigate(result.path)` navigates to `/dashboard/schedule` instead of `/org/my-salon/dashboard/schedule`.

**Impact**: Every search result navigation breaks in production when org-scoped routing is active.

**Fix**: `ZuraCommandSurface` and `useSearchRanking` must use `dashPath()` from `useOrgDashboardPath` to resolve all candidate paths. Chain engine destination hints must also go through this resolver.

### 2. Dual Frequency Systems (Redundancy)

Two separate frequency tracking systems exist:
- `searchRanker.ts` `trackNavFrequency()` — raw unbounded counter in `zura-nav-frequency`
- `searchLearning.ts` `trackFrequencyTimestamp()` — decayed timestamps in `zura-nav-frequency-v2`

The hook passes `decayedFrequencyMap` to the ranker, but `trackNavigation` in `useSearchRanking` still calls the old `trackNavFrequency()`. The old `zura-nav-frequency` key accumulates stale data indefinitely.

**Fix**: Remove `trackNavFrequency` from `searchRanker.ts`. `handleSelect` already calls `learning.logSelection()` which calls `trackFrequencyTimestamp`. Wire `trackNavigation` to use `trackFrequencyTimestamp` instead.

### 3. `enrichedCandidates` Is a No-Op

`useSearchRanking.ts` lines 194-201: `enrichedCandidates` always returns `candidates` unchanged. The memo exists but does nothing. Synonym scoring happens later in the ranking memo via subtitle injection — the enrichment step is dead code.

**Fix**: Remove the `enrichedCandidates` memo. Use `candidates` directly.

### 4. Chained Destination Duplicate Candidates

When a chained destination hint matches an existing nav candidate (e.g., chain produces `/dashboard/admin/sales` which already exists as "Sales Analytics"), both appear in results — the chain virtual candidate AND the regular candidate. No deduplication.

**Fix**: Before injecting the chain virtual candidate, check if a candidate with the same base path already exists. If so, boost the existing candidate's subtitle with chain params instead of creating a duplicate.

### 5. Learning Boost Recalculation Per Render

`computeLearningBoosts()` reads `localStorage` and iterates all events for every candidate on every render. With 50 candidates × 500 events, that's 25,000 iterations per keystroke.

**Fix**: Memoize QPA computation per query (not per candidate). Compute the full `getQueryPathAffinity(query)` once, then look up each candidate path in O(1).

### 6. Action Panel vs Results Rendering Conflict

When an action is detected (e.g., "add client"), both the action panel AND results may render simultaneously. The action panel sits above results but doesn't suppress result rendering, creating visual confusion.

**Fix**: When `hasActiveAction` is true, suppress the result panel. Action takes priority. Results remain as a fallback if the action is cancelled.

### 7. AI Answer Card Shows Without User Intent

`showAICard` triggers for any query matching `isQuestionQuery()` (starts with "how", "what", etc.). Queries like "what's new" or "how much" trigger AI answer mode even though the user wants navigation. The AI card renders on top, pushing results down.

**Fix**: Only show AI card when (a) user explicitly enabled AI mode via toggle/Tab, OR (b) query is a question AND no results score above 0.5. Strong navigation matches should suppress AI auto-activation.

### 8. Suggestion Paths Are Hardcoded `/dashboard/*`

`generateSuggestions()` in `searchRanker.ts` hardcodes paths like `/dashboard/help`, `/dashboard/directory`. Same org-scoping issue as gap #1.

**Fix**: Pass `dashPath` resolver into suggestion generation, or resolve at render time.

### 9. No Keyboard Focus on Action Panel Inputs

When the action panel renders with `input_needed` state, the command input retains focus. The user must manually click into the action input fields.

**Fix**: Auto-focus the first action input field when `actionState === 'input_needed'`.

### 10. `roles` Never Passed to Ranking

`useSearchRanking` accepts `options.roles` but `ZuraCommandSurface` never passes it. The `effectiveRoles` are available but only used for learning. Permission pre-filtering in the ranker uses `userRoles: options.roles || []` — always empty.

**Fix**: Pass `effectiveRoles` as `roles` in the ranking options.

### 11. Synonym Telemetry Logged Inside useMemo

`logSynonymTelemetry()` performs a `localStorage` write inside the ranking `useMemo`. Side effects in memo are unsafe (can fire multiple times or be skipped by React).

**Fix**: Move telemetry logging to a `useEffect` that depends on the expansion result.

### 12. Chain Destination Labels Are Generic

Labels like "Retail Analytics" or "Re-engagement — No bookings" lack context. When a user types "Brooklyn retail last 30 days", the result should say something like "Retail Analytics · Brooklyn · Last 30 Days" — the full chain visible.

**Fix**: Build richer labels from all chain slots.

### 13. `charOverlapQuick` Duplicated

Identical function exists in both `useSearchLearning.ts` and `searchLearning.ts`. 

**Fix**: Export from `searchLearning.ts`, import in hook.

### 14. Missing `options.roles` in Dependency Array

The ranking memo depends on `options.roles` for permission filtering but it's passed as `[]` and never changes, masking this. Once roles are properly passed, the memo needs `options.roles` in deps (already there but evaluating correctly will matter).

## Implementation Plan

### File Changes

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/useSearchRanking.ts` | Edit | Fix org-path resolution, remove dead enrichedCandidates, dedupe chain candidates, fix telemetry side effect, pass roles |
| `src/components/command-surface/ZuraCommandSurface.tsx` | Edit | Use dashPath for navigation, pass roles, suppress results during actions, fix AI card auto-trigger |
| `src/lib/searchRanker.ts` | Edit | Remove old `trackNavFrequency`, resolve suggestion paths |
| `src/lib/searchLearning.ts` | Edit | Memoize QPA computation, export charOverlap |
| `src/hooks/useSearchLearning.ts` | Edit | Import charOverlap from searchLearning, remove duplicate |
| `src/lib/queryChainEngine.ts` | Edit | Richer destination labels from all chain slots |
| `src/components/command-surface/CommandActionPanel.tsx` | Edit | Auto-focus first input |

### Key Refinements

**Route Resolution**: All path references go through `dashPath()`. Candidate pool is built with relative sub-paths (e.g., `/admin/analytics`) and resolved at navigation time. This keeps the candidate pool org-agnostic while navigation is org-aware.

**AI Card Suppression**: `showAICard` changes from:
```
aiMode || (query.trim() && isQuestionQuery(query))
```
to:
```
aiMode || (query.trim() && isQuestionQuery(query) && (!hasResults || rankedResults[0]?.score < 0.5))
```

**Frequency Consolidation**: Remove `trackNavFrequency` export. The learning hook's `trackFrequencyTimestamp` is the sole frequency tracker. `trackNavigation` callback delegates to it.

**QPA Memoization**: `computeLearningBoosts` computes QPA once per query instead of once per candidate:
```typescript
// Before: O(candidates × events) per render
// After: O(events) once per query, then O(1) per candidate lookup
```

**Chain Deduplication**: Before injecting chain virtual candidate:
```typescript
const existingMatch = candidatesForRanking.find(c => 
  c.path && hint.path.startsWith(c.path.split('?')[0])
);
if (existingMatch) {
  // Boost existing candidate with chain context instead of duplicating
} else {
  // Inject virtual candidate
}
```

**Richer Chain Labels**: Build from all slots:
```
"Retail Analytics · Brooklyn · Last 30 Days"
"Re-engagement · No bookings (60 days) · Top Clients"
```

## Threshold & Precedence Summary (Final)

| Signal | Weight | Cap | Notes |
|--------|--------|-----|-------|
| Exact title match | 1.0 | — | Immutable. Never modified by learning or synonyms |
| Text match | 0.25 | — | Includes synonym-boosted subtitle matching (0.9 discount) |
| Intent alignment | 0.25 | — | Parser intent → result type mapping |
| Entity confidence | 0.15 | — | Resolved entity match |
| Recency | 0.10 | — | Recent search history position |
| Frequency (decayed) | 0.10 | — | Time-decayed visit count |
| Role relevance | 0.10 | — | Permission/role match |
| Context boost | 0.05 | — | Same-area navigation |
| Learning QPA | additive | 0.15 | Requires ≥3 prior selections |
| Combined learning | — | 0.20 | Total learned boost cap |
| Final score cap | — | 0.99 | Learning can never equal exact match |
| AI card trigger | — | — | Only when AI mode OR question + no strong results (top < 0.5) |
| Chain activation | — | — | Only when ≥2 classified slots + confidence ≥ 0.4 |
| Concept expansion | — | — | Only when no alias match ≥ 0.8 |

## Performance Improvements

1. **QPA memoization**: ~50x reduction in localStorage reads during ranking (from per-candidate to per-query)
2. **Remove enrichedCandidates no-op memo**: Eliminates one unnecessary array copy per render
3. **Move telemetry out of useMemo**: Eliminates unsafe side effects; prevents double-writes in StrictMode

## Permission Hardening

1. **Roles now passed to ranker**: `computeRoleRelevance` and `filterByPermissions` actually receive user roles
2. **Chain destinations inherit permission checks**: Chain virtual candidates go through the same `filterByPermissions` pre-filter as all candidates
3. **Action panel permission errors remain visible**: No change needed — already shows `ShieldAlert` for permission denied
4. **Learning cannot surface unpermitted results**: Permission filter runs before learning boosts are applied — confirmed correct

## UX Improvements

1. **AI card no longer hijacks strong navigation matches**: "What's New" navigates to changelog instead of triggering AI
2. **Action panel suppresses result noise**: Clean single-focus interface during action flows
3. **Richer chain destination labels**: Users see full context of their multi-part query
4. **Auto-focus on action inputs**: Keyboard-first flow for actions
5. **No duplicate results from chaining**: Single result for each destination

## Recommended Roadmap (Post-Polish)

1. **Saved searches / pinned actions**: Allow users to bookmark frequent queries
2. **Proactive command suggestions**: Show contextual quick actions based on current page (e.g., on Schedule page, suggest "Book Appointment")
3. **Voice input**: Mobile-first voice search entry
4. **Org-wide admin promotions UI**: Build admin interface for the `search_promotions` table
5. **Cross-session learning sync**: Sync learning data across devices via backend storage

## Files Summary

| File | Action |
|------|--------|
| `src/hooks/useSearchRanking.ts` | Edit — org-path resolution, remove dead code, dedupe chains, move telemetry, pass roles |
| `src/components/command-surface/ZuraCommandSurface.tsx` | Edit — dashPath navigation, pass roles, AI card fix, action panel suppression |
| `src/lib/searchRanker.ts` | Edit — remove trackNavFrequency, clean up suggestion paths |
| `src/lib/searchLearning.ts` | Edit — memoize QPA, export charOverlap |
| `src/hooks/useSearchLearning.ts` | Edit — import shared charOverlap |
| `src/lib/queryChainEngine.ts` | Edit — richer destination hint labels |
| `src/components/command-surface/CommandActionPanel.tsx` | Edit — auto-focus first input |

No database changes. No new files. No parser or ranker logic changes — only integration fixes, deduplication, and safety hardening.

