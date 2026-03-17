

# Badge Count, Last-Reset Timestamp, and Configurable Pruning Threshold

Three small additions, all in `SupplyLibraryTab.tsx`. The configurable-per-org threshold is deferred — reading a setting from the database on every collapse toggle adds latency for negligible benefit at current scale.

## 1. Badge on reset button showing saved brand count

Count `localStorage` keys matching `supply-library-categories::` prefix, divide by 1 (each brand has a categories + sublines pair, but categories alone gives the brand count). Display as a small badge on the existing `RotateCcw` button.

**Implementation:** Compute a `savedBrandCount` value by iterating `localStorage` keys. Show a tiny absolute-positioned badge (e.g. `<span className="absolute -top-1 -right-1 ...">3</span>`) on the reset button when count > 0. Wrap button in `relative` positioning.

## 2. Last-reset timestamp in localStorage

On reset confirm action (line 821-833), store `localStorage.setItem('supply-library-last-reset', new Date().toISOString())` after clearing keys. Support teams can inspect this value in DevTools.

## 3. Configurable threshold — skip for now

Making the 500-key threshold configurable per-org via `backroom_settings` would require an async fetch in the persistence effect. The current hardcoded value handles orgs with up to 250 brands (2 keys each), which far exceeds any realistic catalog. Skip unless a concrete need arises.

### File: `src/components/platform/backroom/SupplyLibraryTab.tsx`

**Changes:**
1. Add a `savedBrandCount` memo that counts `supply-library-categories::` keys in localStorage, recalculated when `collapsedCategories` or `resetConfirmOpen` changes.
2. Wrap the RotateCcw button in `relative` and add a conditional badge span showing the count.
3. In the reset `onClick` (line 821), add `localStorage.setItem('supply-library-last-reset', new Date().toISOString())` after clearing keys.

