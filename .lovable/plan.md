

# Integrate Zura Search Command Layer

## Problem
Four systems were built independently (Parser, Ranker, Action Framework, old search). They are not wired together. `ZuraCommandSurface` still consumes the old `useCommandSearch` instead of the new ranking pipeline. There is dead code, duplicated logic, type mismatches, and unrendered features (suggestions, frequency-based recents).

## Changes

### 1. Wire `useSearchRanking` into `ZuraCommandSurface`
**File:** `src/components/command-surface/ZuraCommandSurface.tsx`

- Replace `useCommandSearch` import with `useSearchRanking`
- Replace `groupResults` / `isQuestionQuery` usage with ranking hook output
- Feed `permissions`, `roles`, current path into the ranking hook
- Call `trackNavigation` on result selection
- Render `suggestions` when no results (replace empty state)
- Remove `parseQuery` direct call — action detection moves into the ranking pipeline output

### 2. Unify result types — adapt `CommandResultPanel` + `CommandResultRow`
**Files:** `CommandResultPanel.tsx`, `CommandResultRow.tsx`

- Update to accept `RankedResultGroup[]` instead of `CommandResult[]` + internal `groupResults()`
- `CommandResultRow` accepts `RankedResult` instead of `CommandResult` — add `report` and `utility` to `TYPE_LABELS`
- Remove internal `groupResults` call from panel — groups come pre-computed

### 3. Extract shared `scoreMatch` to a utility
**File:** `src/lib/textMatch.ts` (new)

- Export `scoreMatch()` from one canonical location
- Update `searchRanker.ts`, `useQueryEntityResolver.ts` to import from it
- `useCommandSearch.ts` keeps its own copy (it will be deprecated but not deleted yet to avoid breakage)

### 4. Extract shared `hubChildrenItems` to nav config
**File:** `src/config/dashboardNav.ts` (add export)

- Move `hubChildrenItems` array into `dashboardNav.ts` as a named export
- Update `useSearchRanking.ts` and `useCommandSearch.ts` to import from there

### 5. Render suggestion fallbacks
**File:** `src/components/command-surface/CommandSuggestionRow.tsx` (new)

- Small component for rendering `SuggestionFallback[]` when no results match
- Replaces `CommandEmptyState` in the no-results branch

### 6. Populate `recentPages` from frequency map
**File:** `src/components/command-surface/ZuraCommandSurface.tsx`

- Derive recent pages from `getFrequencyMap()` — top 5 by count, mapped to nav labels
- Feed into `CommandRecentSection`

### 7. Clean up dead code
- Delete `src/components/command/CommandMenu.tsx` (replaced by ZuraCommandSurface, only referenced in a comment)
- Remove comment references in `App.tsx`

### 8. Action detection via ranking pipeline
- `ZuraCommandSurface` will use `parsedQuery` from `useSearchRanking` output to drive `actionExecution.detectAndPrepare` instead of calling `parseQuery()` separately (eliminates double-parse)

## Files Summary

| File | Action |
|------|--------|
| `src/lib/textMatch.ts` | Create — shared `scoreMatch` |
| `src/config/dashboardNav.ts` | Edit — export `hubChildrenItems` |
| `src/components/command-surface/CommandSuggestionRow.tsx` | Create — suggestion fallback UI |
| `src/components/command-surface/ZuraCommandSurface.tsx` | Edit — wire new ranking hook, remove old search |
| `src/components/command-surface/CommandResultPanel.tsx` | Edit — accept `RankedResultGroup[]` |
| `src/components/command-surface/CommandResultRow.tsx` | Edit — accept `RankedResult`, add type labels |
| `src/lib/searchRanker.ts` | Edit — import `scoreMatch` from `textMatch.ts` |
| `src/hooks/useQueryEntityResolver.ts` | Edit — import `scoreMatch` from `textMatch.ts` |
| `src/hooks/useSearchRanking.ts` | Edit — import `hubChildrenItems` from nav config |
| `src/components/command/CommandMenu.tsx` | Delete |
| `src/App.tsx` | Edit — remove dead CommandMenu comments |

No database changes. No edge functions. No parser or ranker logic modifications.

## Performance
- Eliminates double `parseQuery()` call per keystroke
- Eliminates duplicate `useTeamDirectory()` call (old search + new ranking both called it)
- Single memoized pipeline: parse → resolve → rank → group

