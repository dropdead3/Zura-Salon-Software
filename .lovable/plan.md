

## Fix: Show All Dollar Amounts to the Penny

Good directive -- financial data should always be exact. The rounding is happening at multiple layers across the codebase. Here's the full scope.

### Root Cause Analysis

There are **four layers** stripping cents:

1. **Central hook** (`useFormatCurrency.ts`): `formatCurrencyWhole` explicitly passes `noCents: true`
2. **Legacy helper** (`src/lib/formatCurrency.ts`): `formatCurrencyWhole()` also passes `noCents: true`
3. **`AnimatedBlurredAmount`**: defaults `decimals=0`, passes `maximumFractionDigits: 0`
4. **~20 scattered files**: inline `Intl.NumberFormat` calls with `maximumFractionDigits: 0`

### Implementation Plan

**Layer 1: Central hook** (`src/hooks/useFormatCurrency.ts`)
- Change `formatCurrencyWhole` to stop passing `noCents: true` -- use `decimals: 2` instead
- Change `formatCurrencyCompact` default from `noCents: true` to `noCents: false`
- This single change fixes **137 files** that call `formatCurrencyWhole` through the hook

**Layer 2: Legacy helper** (`src/lib/formatCurrency.ts`)
- Change `formatCurrencyWhole` to use `decimals: 2` instead of `noCents: true`
- This fixes the remaining direct imports (e.g. `VisitHistoryTimeline`, `ExecutiveTrendChart`)

**Layer 3: AnimatedBlurredAmount** (`src/components/ui/AnimatedBlurredAmount.tsx`)
- Change default `decimals` from `0` to `2`
- Update the formatting call to default to 2 decimal places

**Layer 4: AnimatedNumber** (`src/components/ui/AnimatedNumber.tsx`)
- Change default `decimals` from `0` to `2` for currency contexts

**Layer 5: Scattered inline formatters** (~20 files with `maximumFractionDigits: 0`)
- Update all inline `Intl.NumberFormat` calls that format currency to use `maximumFractionDigits: 2, minimumFractionDigits: 2`
- Files include: `TeamCompensationTable`, `TierProgressionCard`, `PaydayCountdownBanner`, `MyPayStubHistory`, `EarningsBreakdownCard`, `AddUserSeatsDialog`, `ProductLeaderboard`, `RentersTabContent`, `Revenue.tsx`, `RentRevenueTab`, `PayrollKPICards`, `RentRevenueAnalytics`, `useBenchmarkData`

**Layer 6: Billing/Platform formatters**
- `InvoicePreview` uses its own `formatCurrency` from `useBillingCalculations` -- verify it already shows cents (it likely does since it uses 'auto' decimals)

### Technical Notes
- The `formatCurrency` base function in `src/lib/format.ts` already defaults to `'auto'` which gives 2 decimals via `Intl.NumberFormat`. The problem is exclusively callers opting into 0 decimals.
- `formatCurrencyCompact` (e.g. "$1.2K") will now show "$1.23K" -- this is correct for penny-precision but may look dense on chart axis labels. Chart axis ticks may warrant keeping compact rounding as a special case.
- No database or backend changes needed -- this is purely display formatting.

### Estimated scope
- ~25 files modified
- All changes are mechanical: swap `0` to `2` for fraction digits on currency formatting

