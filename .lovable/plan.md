

## Analysis: Gaps & Enhancements in the Mixing/Dispensing Flow

After reviewing the full implementation, here are the actionable improvements worth considering:

### 1. Progress bar is hardcoded, not data-driven
**File:** `DockLiveDispensing.tsx` line 251
The bowl overview progress bar uses a static `75` when in-progress. It should reflect actual dispensing progress: `(lines with weight entered) / (total lines) * 100`.

### 2. No auto-advance to next ingredient after dispensing
When a stylist enters weight for one ingredient and taps confirm, they return to the bowl overview. The Vish flow auto-advances to the **next unfilled ingredient**, saving a tap per item.

### 3. "Done" in ingredient view doesn't confirm weight
The "Done" action button in `DockIngredientDispensing` just calls `onBack` — it exits without persisting anything. If the stylist entered weight via numpad, it's already saved. But "Done" should have clear completion semantics (e.g., mark ingredient as dispensed, show checkmark feedback, then advance).

### 4. No haptic feedback on dispensing actions
Per the Dock UI standards, interactions should trigger `navigator.vibrate(15)`. The ingredient dispensing view's action buttons and weight confirmation don't include this.

### 5. Carousel doesn't auto-scroll to active item
The bottom carousel in `DockIngredientDispensing` doesn't scroll to keep the active ingredient card visible when navigating via the chevron buttons.

### 6. No "Undo" for weight entry
Once a weight is submitted, there's no way to clear or redo it without re-entering the numpad. A quick-undo or "Reset" option on the ingredient view would prevent errors.

### 7. Weight pill shows "0" ambiguously
The weight pill shows `0 / 30g` before any entry. In the Vish reference, un-started ingredients show a distinct "Tap to weigh" prompt rather than a zero value.

---

### Recommended Priority (effort vs impact)

| # | Enhancement | Effort | Impact |
|---|-------------|--------|--------|
| 1 | Data-driven progress bar | Small | Medium |
| 2 | Auto-advance to next ingredient | Small | High |
| 7 | "Tap to weigh" prompt vs "0" | Small | Medium |
| 4 | Haptic feedback | Small | Medium |
| 5 | Carousel auto-scroll | Small | Medium |
| 3 | Done button semantics | Medium | Medium |
| 6 | Undo/reset weight | Medium | Low |

### Proposed Plan — Batch All Quick Wins

**`src/components/dock/mixing/DockLiveDispensing.tsx`**
- Replace hardcoded `75` with actual `(filledCount / totalCount) * 100` using `currentWeights`

**`src/components/dock/mixing/DockIngredientDispensing.tsx`**
- After numpad weight submit: auto-navigate to next unfilled ingredient instead of staying on current
- Replace `0 / 30g` with `Tap to weigh / 30g` when `currentWeight === 0`
- Add `navigator.vibrate?.(15)` on action button taps and weight submission
- On `onNavigate`, scroll carousel to bring active card into view via `scrollIntoView`
- "Done" button: if all ingredients have weight, call `onBack`; otherwise advance to next unfilled

**Files changed:** 2 files, all small targeted edits.

