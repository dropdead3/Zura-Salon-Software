

# localStorage Budget Check + Reset Confirmation Dialog

Two targeted improvements to the existing collapse state management, all in `SupplyLibraryTab.tsx`.

## 1. localStorage size budget check

In the persistence `useEffect` hooks (lines 84-91), before writing a new key, count existing `supply-library-*` keys. If the count exceeds a threshold (e.g. 500 keys), prune the oldest entries by removing keys for brands not currently selected. This prevents unbounded growth for orgs with hundreds of brands.

**Implementation:**
- Add a helper `pruneCollapseKeys(maxKeys: number)` that iterates `localStorage`, collects all `supply-library-categories::` and `supply-library-sublines::` keys, and if count > `maxKeys`, removes keys not matching the current `orgId::selectedBrand`.
- Call it inside the existing persistence effects, only when a write is about to happen.

## 2. Confirmation dialog on Reset All

Wrap the existing reset button's `onClick` (lines 783-795) with a confirmation step using the existing `AlertDialog` components already imported in `PlatformDialog`.

**Implementation:**
- Add state `resetConfirmOpen` (boolean).
- Replace the direct `onClick` handler on the RotateCcw button with `() => setResetConfirmOpen(true)`.
- Add an `AlertDialog` with `PlatformAlertDialogContent` confirming "This will clear saved collapse/expand preferences for all brands. Continue?" with Cancel and Confirm actions.
- Move the existing cleanup logic into the confirm action handler.

## 3. "Copy collapse layout" — Skip for now

This feature involves cross-location data sharing which requires a backend table to store layouts. It's a larger scope change better suited as a standalone feature. Skipping in this iteration.

### Files modified
- `src/components/platform/backroom/SupplyLibraryTab.tsx` — budget check helper, confirmation dialog for reset

