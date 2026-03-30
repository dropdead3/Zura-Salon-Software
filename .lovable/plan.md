

## Adaptive Compact Numbers for Sales Overview Card

### Problem
When the Sales Overview card is rendered in a narrow column, large currency values ($81,073.25, $67,698.60, etc.) overflow or clip because there's not enough horizontal space for the full formatted number.

### Solution
Use a container-width-aware approach that switches `AnimatedBlurredAmount` to compact notation ($81.1K, $67.7K) when the card is narrow.

### Implementation

**1. Add `compact` prop to `AnimatedBlurredAmount`** (`src/components/ui/AnimatedBlurredAmount.tsx`)
- Accept optional `compact?: boolean` prop
- When `compact` is true, format using `formatCurrency(value, currency, { compact: true })` via the unified `format.ts` (which already supports `notation: 'compact'`)
- For non-currency values, use `Intl.NumberFormat` with compact notation

**2. Add container width detection to `AggregateSalesCard`** (`src/components/dashboard/AggregateSalesCard.tsx`)
- Add a `ref` on the card's inner content container
- Use a `ResizeObserver` (via a small `useContainerCompact` hook or inline) to track container width
- Set a `compactNumbers` boolean state: `true` when container width < ~400px
- Pass `compact={compactNumbers}` to every `AnimatedBlurredAmount` in the card (hero total, services, retail, daily avg, avg ticket, rev/hour)
- Also apply compact formatting to any inline `formatCurrency()` calls (e.g. scheduled badge, remaining badge) using a conditional

**3. Files changed:**
| File | Change |
|------|--------|
| `src/components/ui/AnimatedBlurredAmount.tsx` | Add `compact` prop; use compact `formatCurrency` when true |
| `src/components/dashboard/AggregateSalesCard.tsx` | Add ResizeObserver on content container; derive `compactNumbers` state; pass to all `AnimatedBlurredAmount` instances and inline `formatCurrency` calls |

### Technical Detail
- `formatCurrency` in `src/lib/format.ts` already supports `compact: true` → uses `Intl.NumberFormat({ notation: 'compact', compactDisplay: 'short' })` producing `$81.1K`, `$3.5K`, etc.
- The `AnimatedBlurredAmount` currently imports `formatCurrency` from `src/lib/formatCurrency.ts` (legacy wrapper). The compact path will call the unified `format.ts` version directly.
- ResizeObserver threshold of ~400px chosen because at that width, 5+ digit currency values start clipping in `text-2xl`+ sizes.
- No changes needed to `format.ts` — the compact formatting infrastructure is already there.

