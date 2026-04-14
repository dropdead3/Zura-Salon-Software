

# Fix Uneditable Tip Percentage Inputs

## Problem
When the user blurs a percentage input, `handlePercentageBlur` calls `save()`, which:
1. Calls `setLocalConfig(next)` — immediately resetting the numeric config
2. Fires `updateTip.mutate()` — which on success invalidates the query
3. Query refetch triggers the `useEffect` on line 19-24, which overwrites `localPercentages` with server values

This creates a loop where inputs get reset before the user can edit them. The inputs become effectively frozen.

## Fix — `ZuraPayTippingTab.tsx`

1. **Add a `justSaved` ref** to skip the sync effect right after a save:
   - `const justSaved = useRef(false)`
   - In `save()`, set `justSaved.current = true`
   - In the `useEffect`, check `if (justSaved.current) { justSaved.current = false; return; }` before overwriting local state

2. **Iterate `localPercentages`** instead of `localConfig.percentages` in the `.map()` on line 93 — this ensures the render source of truth is the string state, not the numeric config that gets reset by `save()`.

3. **Don't call `setLocalConfig` inside `save()` for percentage changes** — let the query refetch handle that naturally. Only update `localConfig` for non-percentage fields.

These three changes break the reset loop while keeping the blur-to-save behavior intact.

