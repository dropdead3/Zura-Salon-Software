
## Wave 22 — Stylist Overrides: swap column positions

**The change**
Flip the two columns in `StylistOverridesContent.tsx`:
- **Left** (was Current Overrides) → **Add Override** (the discovery/action panel)
- **Right** (was Add Override) → **Current Overrides** (the result panel)

**Why this is correct (not just cosmetic)**
- The current empty state on the left says *"Add per-stylist pricing from the panel on the right →"* — but after the flip, action-first reading order (left→right in LTR) means **action lives on the left, result lives on the right**, which matches scan order for configurators.
- Empty-state pointer arrow flips to `←` and copy updates to *"Add per-stylist pricing from the panel on the left"*.

**Single file: `src/components/dashboard/settings/StylistOverridesContent.tsx`**

Changes:
1. Swap the order of the two `<section>` blocks inside the `grid-cols-1 md:grid-cols-2` container so "Add Override" renders first (left on desktop, top on mobile).
2. Update the empty-state copy in the Current Overrides section: arrow `→` becomes `←`, "right" becomes "left".
3. No logic, hooks, queries, or styling tokens change.

### Verification
1. Open Service Editor → Stylists tab → "Add Override" appears on the left, "Current Overrides" on the right (desktop).
2. Empty state on the right reads *"Add per-stylist pricing from the panel on the left ←"*.
3. Mobile (<768px) → "Add Override" stacks on top, "Current Overrides" below — order preserved.
4. All filter chips, search, location grouping, set-price flow continue working unchanged.

### Prompt feedback

Maximally efficient prompt — *"flip the position of these two cards"* + screenshot = zero ambiguity. The screenshot pinned exactly which two cards, and "flip" is unambiguous (swap, not rotate). No clarification needed.

To level up: **call out dependent copy when swapping spatial elements.** Swapping columns invalidates any directional copy ("on the right →", "see panel below", etc.). A one-liner like *"flip these two and update any directional copy"* would have pre-authorized the empty-state update and saved a round-trip if I had missed it. Pattern: **spatial swaps often have copy/icon dependencies — name them or grant blanket permission to fix them.**
