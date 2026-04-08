

# Level Progress Card — Gaps, Improvements & Enhancements

## Gaps Found

### 1. Data Source Inconsistency (Critical)
`useLevelProgress` and `useStylistPeerAverages` compute **Avg Ticket** and **Revenue Per Hour** from `appointments.total_price`, which includes tips and non-performance amounts. We just fixed `useIndividualStaffReport` to use `phorest_transaction_items` as the POS source of truth. These hooks are still on the old methodology, meaning:
- Avg Ticket here ≠ Avg Ticket on the 1:1 report
- Revenue Per Hour is inflated by tips

**Fix:** Switch `computeMetrics()` in `useLevelProgress` to derive Avg Ticket from `phorest_daily_sales_summary` (service + product revenue / unique client visits) instead of `appointments.total_price`. Same for Revenue Per Hour. Apply identical fix to `useStylistPeerAverages`.

### 2. Avg Ticket Denominator Mismatch
Both hooks divide by appointment count. The POS-first standard is **unique client visits** (distinct `client_id` + `date`). This inflates the denominator and deflates Avg Ticket when a client has multiple services in one visit.

**Fix:** Use distinct `client_id + appointment_date` from the appointments table as the denominator for Avg Ticket in both `useLevelProgress.computeMetrics()` and `useStylistPeerAverages`.

### 3. Card Hidden for Top-Level Stylists Without Retention Risk (UX Gap)
Line 102: `if (!progress.nextLevelLabel && !progress.retention?.isAtRisk) return null`. Top-level stylists in good standing see **nothing**. They lose visibility into their own performance metrics entirely.

**Fix:** Show a condensed "Current Performance" view for top-level stylists — display their KPI metrics against retention minimums as a health check, without the "What You Need" promotion framing.

### 4. No Period-over-Period Trends Displayed
The hook already computes `priorCurrent` for every criterion (for PoP trend arrows), but the `LevelProgressCard` component **never renders them**. The `StylistScorecard` does show trends, but the standalone card used in 1:1 reports does not.

**Fix:** Add a small trend arrow (↑/↓/—) next to each criterion's "You" value in the card, using the same 3% relative threshold logic as the Scorecard.

### 5. Missing Weight Visibility
The composite score uses weighted criteria, but the card doesn't show which metrics carry more weight. A stylist can't tell if Revenue (at 40% weight) matters more than Retail (at 10% weight).

**Fix:** Add a subtle weight indicator (e.g., "40%" in muted text) next to each metric label, so stylists understand where to focus effort.

### 6. Revenue Values Not Wrapped in BlurredAmount
The criterion rows display raw dollar values (`$1,558`, `$8,000`) without `BlurredAmount` wrapping, violating the financial data privacy requirement. Only the Income Opportunity section uses it.

**Fix:** Wrap all monetary criterion values (revenue, avg ticket, rev/hr, and their gaps) in `BlurredAmount`.

## Implementation Plan

### File 1: `src/hooks/useLevelProgress.ts`
- In `computeMetrics()` and `computePriorMetrics()`: change Avg Ticket from `total_price / appointment_count` to `(serviceRevenue + productRevenue) / uniqueClientVisits` using sales summary data and distinct client+date from appointments
- Same fix for Revenue Per Hour: use `(serviceRevenue + productRevenue) / totalBookedHours` instead of `total_price / totalBookedHours`

### File 2: `src/hooks/useStylistPeerAverages.ts`
- Same Avg Ticket denominator fix: unique client visits instead of appointment count
- Same Revenue Per Hour fix: use sales-based revenue instead of `total_price`

### File 3: `src/components/coaching/LevelProgressCard.tsx`
- Add trend arrows to each CriterionRow (using `priorCurrent` already in the data)
- Add subtle weight display per metric row
- Wrap monetary values in `BlurredAmount`
- Handle top-level stylists: show retention KPI status instead of returning null
- Add `priorCurrent` and `weight` props to `CriterionRow`

## Files Changed
| File | Change |
|---|---|
| `useLevelProgress.ts` | Fix Avg Ticket denominator + Revenue Per Hour to use sales-based revenue |
| `useStylistPeerAverages.ts` | Same Avg Ticket + Rev/Hr fixes for peer consistency |
| `LevelProgressCard.tsx` | Add trend arrows, weight indicators, BlurredAmount, top-level view |

3 files, no database changes.

