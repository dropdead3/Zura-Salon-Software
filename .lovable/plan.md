

## Goal
Surface a visible, actionable prompt directly under the "Checkout Total" line when the rebook gate hasn't been resolved — making the structural enforcement legible instead of silent.

## Why this matters
Today the gate works (the Charge buttons live below `gatePhase === 'checkout'`, so they're hidden until the rebook is booked or declined-with-reason), but the operator sees no inline explanation under the total. They scroll, see "$64.80", and wonder where the Charge button is. This adds the missing **why**.

Aligns with doctrine: *Silence is valid output, but structural gates must be legible. Decline tracking already flows to staff reports via `rebook_decline_reasons`.*

## Scope (single file)

**File:** `src/components/dashboard/schedule/CheckoutSummarySheet.tsx`

Insert a `text-warning`-toned prompt block immediately after the `Checkout Total` row (line ~956), rendered only when `gatePhase === 'gate'`:

### Prompt content
```
[CalendarPlus icon]  Rebook required to continue checkout
Book the next visit above, or skip with a tracked reason.
[Book Next Visit]   [Skip Rebook]
```

- **Container**: `border-warning/40 bg-warning/[0.06] rounded-md p-3` (matches existing unset-price warning pattern below it)
- **Heading**: `font-display text-xs tracking-wide text-warning` — "Rebook Required to Continue Checkout"
- **Subtext**: `font-sans text-xs text-muted-foreground` — explains the two valid paths
- **Two inline buttons** (`tokens.button.inline`, `variant="ghost"` with warning-tinted text):
  - **"Book Next Visit"** → scrolls to / focuses the `NextVisitRecommendation` card at the top of the sheet (use `scrollIntoView({ behavior: 'smooth' })` on a ref attached to the gate card)
  - **"Skip Rebook"** → opens existing `RebookDeclineReasonDialog` (`setDeclineDialogOpen(true)`) — already wired to insert into `rebook_decline_reasons` via `useLogRebookDeclineReason`, which already powers `RebookDeclineReasonsCard` in staff reports

### Visibility logic
- Render only when `gatePhase === 'gate'`
- Hide once `rebooked === true` OR a decline reason is captured (gate transitions to `'checkout'`)

### Reinforcement on the total itself
When gated, render the `Checkout Total` value with `text-muted-foreground` (instead of full `text-foreground`) — visually signals "not yet actionable." Reverts to full contrast once gate clears.

## Tracking confirmation (no new work)
- "Skip Rebook" → `RebookDeclineReasonDialog` → `useLogRebookDeclineReason` → inserts to `rebook_decline_reasons` table with `appointment_id`, `staff_user_id`, `reason_code`
- Already consumed by `RebookDeclineReasonsCard.tsx` in analytics + per-stylist reports
- No schema/hook changes needed

## Token compliance
- `text-warning` semantic token (already shipped)
- `font-display` for the heading (uppercase, tracking)
- `font-sans` for subtext (no uppercase)
- `tokens.button.inline` for the two CTAs
- Max weight `font-medium`

## Out of scope
- Persistent "skipped" badge on the closed appointment card (separate visibility wave)
- Per-stylist skip-rate threshold alerts (already handled by `RebookDeclineReasonsCard` in coaching reports)

## File to modify
1. `src/components/dashboard/schedule/CheckoutSummarySheet.tsx` — add gated prompt block under Checkout Total row, attach scroll ref to `NextVisitRecommendation` container, dim total value when gated

