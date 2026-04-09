

# Zura Command Surface — Audit Round 3

## Bugs

### 1. `CommandPreviewPanel` receives potentially null `activePreview` (Type Safety)
**File**: `ZuraCommandSurface.tsx` line 605
```tsx
<CommandPreviewPanel result={activePreview} />
```
`activePreview` is typed `RankedResult | null`, but `CommandPreviewPanel` expects `result: RankedResult` (non-nullable). The runtime guard `hasPreview && ...` prevents crashes, but TypeScript should flag this. Add a non-null assertion or narrow with `activePreview &&`.

**Fix**: `result={activePreview!}` or restructure the conditional.

### 2. `useActionExecution` — `submitInputs` and `confirm` use stale `state` (Closure Bug)
**File**: `useActionExecution.ts` lines 196-225
Both `submitInputs` and `confirm` read from the `state` variable captured in their `useCallback` closure:
```ts
const submitInputs = useCallback(() => {
  const { activeAction, collectedInputs } = state;
  // ...
}, [state, executeAction]);
```
Because `state` is the entire state object, these callbacks are recreated on every state change — which is correct for freshness but means `state` in `[state, executeAction]` causes cascading re-renders. The real issue is that `actionExecution.reset` in `ZuraCommandSurface.tsx` depends on `useCallback(() => setState(INITIAL_STATE), [])` which IS stable — so the prior fix using `actionResetRef` is now redundant but harmless.

**Status**: Not a bug, but `submitInputs`/`confirm` could use functional `setState` pattern to avoid the `state` dependency. Low priority.

### 3. Preview panel missing for `inventory`, `appointment`, and `task` types (Gap)
**File**: `CommandPreviewPanel.tsx` lines 14-28
The preview switch only handles `client`, `team`, `report`, and a default `NavigationPreview`. New entity types (`inventory`, `appointment`, `task`) all fall through to the generic `NavigationPreview` — which shows a title and path but no contextual data (stock level, appointment time, task status).

**Fix**: Add `InventoryPreview`, `AppointmentPreview`, and `TaskPreview` components, or enrich the default `NavigationPreview` to render subtitle/metadata when present.

### 4. Proactive state "Actions" section items are not clickable/actionable (UX Bug)
**File**: `CommandProactiveState.tsx` lines 121-132
The recommended actions render with `cursor-default` and no `onClick`:
```tsx
<div key={i} className={cn(ROW_BASE, 'cursor-default')}>
```
These should either trigger the action execution flow or navigate to the relevant page. Currently they're display-only, which breaks the "execution first" promise.

**Fix**: Add `onClick={() => onNavigate(action.path || '/dashboard')}` or wire into the action execution system.

### 5. `today` variable in `useAppointmentSearchCandidates` is computed at module-eval time (Stale Date)
**File**: `useCommandEntitySearch.ts` line 107
```ts
const today = new Date().toISOString().split('T')[0];
```
This is inside the component body but outside `useMemo`/`useQuery`. It re-evaluates on every render, which is fine — but the query key includes `today`, so if the user leaves a tab open overnight and opens the command surface the next day, `today` changes and triggers a refetch. This is actually correct behavior. **No fix needed** — noting for completeness.

### 6. `handleKeyDown` missing `hasQuery`/`hasResults` in dependency array (Potential Stale Closure)
**File**: `ZuraCommandSurface.tsx` line 376
`handleKeyDown` references `hasActiveAction` but the `useCallback` deps don't include `hasQuery` or `hasResults`, which are used in the Enter branch (line 372-373). These are derived from `query` and `flatResults` which ARE in deps, so the values are fresh. **No fix needed**.

### 7. Entity search candidates don't include search keywords for fuzzy matching (Ranking Gap)
**File**: `useCommandEntitySearch.ts`
Client candidates only have `title = fullName`. The ranker scores via `scoreMatch(candidate.title + ' ' + (candidate.subtitle || ''), q)`. Phone numbers and emails are in subtitle, so searching "555-1234" would match. But searching by last name only may underperform because `scoreMatch` does substring matching, not word-boundary matching.

**Fix**: Add `keywords` or `searchText` field to `SearchCandidate` that concatenates all searchable fields. This requires a minor schema addition to `SearchCandidate` and a one-line change in the ranker.

### 8. No keyboard navigation in proactive state (Interaction Gap)
**File**: `CommandProactiveState.tsx`
When no query is typed, the proactive state shows Actions, Today, Recent, Navigate sections — but arrow keys and Enter don't work on these items. The keyboard handler in `ZuraCommandSurface` only operates on `flatResults`, which is empty when there's no query.

**Fix**: Build a `proactiveItems` array for keyboard navigation in the default state, or add `tabIndex={0}` with focus management. This is a medium-effort enhancement.

### 9. Duplicate comment in `useSearchRanking.ts` (Cosmetic)
**File**: `useSearchRanking.ts` lines 209-210
```ts
// Action candidates from the registry
// Action candidates from the registry
```

## Fix Plan

| # | Fix | Priority | File |
|---|-----|----------|------|
| 1 | Null-guard `activePreview` in JSX | Quick | `ZuraCommandSurface.tsx` |
| 2 | Skip (low priority, no user impact) | — | — |
| 3 | Add entity preview components for inventory, appointment, task | Medium | `CommandPreviewPanel.tsx` + new preview files |
| 4 | Make proactive "Actions" items clickable | High | `CommandProactiveState.tsx` |
| 5 | No fix needed | — | — |
| 6 | No fix needed | — | — |
| 7 | Add `searchText` to `SearchCandidate` for richer fuzzy matching | Medium | `searchRanker.ts` + `useCommandEntitySearch.ts` + `useSearchRanking.ts` |
| 8 | Add keyboard nav to proactive state | Medium | `ZuraCommandSurface.tsx` + `CommandProactiveState.tsx` |
| 9 | Remove duplicate comment | Quick | `useSearchRanking.ts` |

### Implementation Details

**Fix #3 — Entity Previews**: Create three lightweight preview components:
- `InventoryPreview`: Show product name, brand, SKU, category, quantity on hand, and a "View in Inventory" link
- `AppointmentPreview`: Show client name, service, time, status, and a "View Schedule" link
- `TaskPreview`: Show task title, priority, due date, completion status

Each reads from the `result.subtitle` and `result.metadata` fields already populated by the entity hooks.

**Fix #4 — Clickable Actions**: The `recommendedActions` from `useProactiveIntelligence` need a `path` or `actionId` field. If the hook already provides a destination, wire it. If not, map action labels to known routes from the action registry.

**Fix #7 — SearchText**: Add optional `searchText?: string` to `SearchCandidate`. In the ranker, score against `candidate.searchText || (candidate.title + ' ' + (candidate.subtitle || ''))`. In entity hooks, set `searchText` to concatenate all searchable fields (name + phone + email for clients, name + SKU + brand for products).

**Fix #8 — Keyboard in Proactive State**: Flatten proactive items into an ordered array, pass to `ZuraCommandSurface` as a `proactiveItems` ref. When `!hasQuery`, arrow keys navigate this array and Enter triggers the item's action. This mirrors the existing `flatResults` pattern.

### Files Changed

| File | Fixes |
|------|-------|
| `src/components/command-surface/ZuraCommandSurface.tsx` | #1, #8 (keyboard nav wiring) |
| `src/components/command-surface/CommandProactiveState.tsx` | #4, #8 (expose items for keyboard) |
| `src/components/command-surface/CommandPreviewPanel.tsx` | #3 (switch cases) |
| `src/components/command-surface/previews/InventoryPreview.tsx` | #3 (new file) |
| `src/components/command-surface/previews/AppointmentPreview.tsx` | #3 (new file) |
| `src/components/command-surface/previews/TaskPreview.tsx` | #3 (new file) |
| `src/lib/searchRanker.ts` | #7 (searchText support) |
| `src/hooks/useCommandEntitySearch.ts` | #7 (add searchText) |
| `src/hooks/useSearchRanking.ts` | #9 (remove dupe comment) |

