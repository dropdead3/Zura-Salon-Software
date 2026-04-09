

# Zura Command Surface — Audit Round 2

## Bugs

### 1. Console Error: `CommandProactiveState` cannot receive refs (Active Bug)
**File**: `ZuraCommandSurface.tsx` line 552, `CommandProactiveState.tsx`
The console shows: "Function components cannot be given refs. Check the render method of ZuraCommandSurface." This is caused by `AnimatePresence` or a parent trying to pass a ref down. `CommandProactiveState` is a plain function component — it needs to be wrapped in `React.forwardRef` (even if it ignores the ref) to suppress the warning.

### 2. Scope filter desync: groups vs flatResults (Functional Bug)
**File**: `ZuraCommandSurface.tsx` lines 159-171 vs line 521
When a scope filter is active (e.g. "Clients"), `flatResults` is correctly filtered. But `CommandResultPanel` on line 521 receives the **unfiltered** `groups` prop — so the visual results show ALL types while keyboard navigation operates on the filtered subset. This causes:
- Arrow keys skip visible rows
- Selected highlight appears on wrong items
- Enter opens wrong result

**Fix**: Pass scope-filtered groups to `CommandResultPanel`, not the raw `groups`.

### 3. `selectedIndex` can exceed `flatResults.length` on scope change (Index Bug)
**File**: `ZuraCommandSurface.tsx` lines 324-329
When switching scope filters, `selectedIndex` isn't reset to 0. If you had index=8 in "All" and switch to "Clients" with 3 results, arrow navigation breaks silently.

**Fix**: Reset `selectedIndex` to 0 when `effectiveScope` changes (add a `useEffect`).

### 4. `useTasks()` fetches unconditionally (Performance)
**File**: `useSearchRanking.ts` line 146
`useTasks()` runs every time the hook is active, fetching all user tasks regardless of whether the command surface is open or a query is typed. Unlike entity hooks which use `enabled`, tasks always fetch.

**Fix**: Not blocking — note for future optimization. The hook should accept an `enabled` parameter.

### 5. `decayedFreqMap` memoized on `open` identity, not value (Stale Data)
**File**: `ZuraCommandSurface.tsx` line 124
```typescript
const decayedFreqMap = useMemo(() => learning.getDecayedFrequencyMap(), [open]);
```
`open` is a boolean that toggles. This means the map only refreshes when the surface opens/closes, but the dependency `open` is referentially unstable (alternates true/false). It works by accident — but the intent should be clearer. Use `// eslint-disable-next-line` or extract to a ref.

### 6. `handleHoverImmediate` dependency creates unnecessary re-renders (Performance)
**File**: `ZuraCommandSurface.tsx` lines 204-208
```typescript
useEffect(() => {
  if (flatResults[selectedIndex]) {
    handleHoverImmediate(flatResults[selectedIndex]);
  }
}, [selectedIndex, flatResults, handleHoverImmediate]);
```
`flatResults` is a new array reference on every render (from `useMemo` with many deps), causing this effect to fire excessively and trigger preview panel re-renders on every keystroke.

### 7. `actionExecution.reset` in cleanup deps causes re-renders (React Warning Risk)
**File**: `ZuraCommandSurface.tsx` line 246
```typescript
}, [open, resetAI, actionExecution.reset, clearPreview]);
```
`actionExecution.reset` is a new function reference each render (from `useCallback` without stable deps in `useActionExecution`). This causes the cleanup effect to re-run on every render, potentially resetting state mid-session.

## Gaps

### 8. No `appointment` scope in filter chips
**File**: `CommandSearchFilters.tsx` lines 12-20
The `SCOPES` array has: All, Pages, People, Actions, Clients, Inventory, Tasks — but no "Appointments" chip. Users who see appointment results in "All" can't filter to just appointments.

### 9. No "report" or "insight" scope chips
Same file. The `RankedResultType` includes `report`, `utility`, and `insight` but none have filter chips. This is acceptable for now but means these types are only reachable through "All".

### 10. `CommandResultPanel` passes unfiltered `groups` — no scope awareness
Already described in Bug #2. The panel renders all groups regardless of active scope filter.

### 11. Missing keyboard shortcut: `⌘↵` for action execution
**File**: `ZuraCommandSurface.tsx` line 330
The footer shows `⌘↵ → run action` but there's no `handleKeyDown` case for `Meta+Enter` or `Ctrl+Enter`. The shortcut is advertised but not implemented.

---

## Fix Plan

| # | Fix | File |
|---|-----|------|
| 1 | Wrap `CommandProactiveState` in `React.forwardRef` | `CommandProactiveState.tsx` |
| 2 | Build scope-filtered groups and pass to `CommandResultPanel` | `ZuraCommandSurface.tsx` |
| 3 | Reset `selectedIndex` on `effectiveScope` change | `ZuraCommandSurface.tsx` |
| 4 | Add `appointment` to scope filter chips + `scopeTypeMap` | `CommandSearchFilters.tsx` + `ZuraCommandSurface.tsx` |
| 5 | Implement `⌘↵` / `Ctrl+Enter` keyboard shortcut for action execution | `ZuraCommandSurface.tsx` |
| 6 | Stabilize `flatResults` reference to reduce preview churn | `ZuraCommandSurface.tsx` |
| 7 | Stabilize `actionExecution.reset` in cleanup effect deps | `ZuraCommandSurface.tsx` |

### Files Changed

| File | Fixes |
|------|-------|
| `src/components/command-surface/CommandProactiveState.tsx` | #1 — forwardRef wrapper |
| `src/components/command-surface/ZuraCommandSurface.tsx` | #2, #3, #4 (scopeTypeMap), #5, #6, #7 |
| `src/components/command-surface/CommandSearchFilters.tsx` | #4 — add Appointments chip |

