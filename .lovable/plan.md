

## Auto-Compact Numbers Everywhere via Self-Aware AnimatedBlurredAmount

### Problem
Only the Sales Overview card currently switches to compact numbers when space is tight. Every other card with `AnimatedBlurredAmount` (16 files, ~30+ instances) still overflows at narrow widths.

### Solution
Instead of adding ResizeObserver to every parent component, make `AnimatedBlurredAmount` **self-aware** of overflow. The component will measure its own rendered text against its container and automatically switch to compact notation when it detects the text would clip.

### Implementation

**1. Add auto-compact logic inside `AnimatedBlurredAmount`** (`src/components/ui/AnimatedBlurredAmount.tsx`)

- Keep the existing `compact` prop as an explicit override
- Add a new `autoCompact` prop (default `true` for currency values) that enables self-measurement
- Use a `ResizeObserver` on the `<span>` element itself combined with a check: if `scrollWidth > clientWidth` (text is clipping), flip to compact formatting
- Implementation approach:
  - Render normally first
  - On mount and resize, check if the span is overflowing
  - If overflowing and value ≥ 1000 (compact only makes sense for large numbers), re-render with compact notation
  - Store `isAutoCompact` in local state

**2. Remove per-card ResizeObserver from `AggregateSalesCard`** (`src/components/dashboard/AggregateSalesCard.tsx`)

- Remove the `cardRef`, `compactNumbers` state, and `ResizeObserver` useEffect added in the previous change
- Remove all `compact={compactNumbers}` props from `AnimatedBlurredAmount` instances (the component now handles this internally)
- This simplifies the card back to its original structure

**3. Files changed:**

| File | Change |
|------|--------|
| `src/components/ui/AnimatedBlurredAmount.tsx` | Add `autoCompact` self-measurement logic using overflow detection; keep `compact` as explicit override |
| `src/components/dashboard/AggregateSalesCard.tsx` | Remove ResizeObserver, `compactNumbers` state, and `compact={compactNumbers}` from all instances |

### Technical Detail

- Overflow detection: the `<span>` gets `overflow-hidden text-ellipsis whitespace-nowrap` styles, then `scrollWidth > clientWidth` reliably detects clipping
- Only triggers for values ≥ 1000 (below that, compact notation is identical to standard)
- Uses `ResizeObserver` on the span itself (not a parent), so it works regardless of which card/layout hosts it
- The auto-compact check runs after each value animation frame settles, not during animation, to avoid flicker
- Every `AnimatedBlurredAmount` with `currency` set will automatically benefit — no changes needed in the 16 consumer files

