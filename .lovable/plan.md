## Goal

Make the **Sales Overview** card in Simple view denser and more honest:

1. Show **three stacked metrics** instead of a single hero number:
   - **Current Sales** — actual POS revenue today (or period total when not "today")
   - **Expected Sales** — booked/forecasted revenue
   - **Retail Attach Rate** — current period
2. On **closed days**, suppress the numbers and show a contextual closure message:
   - All locations closed → "Locations Closed"
   - Single location closed → "Mesa Closed — No Sales" (uses location name)
   - Holiday closure → "Mesa Closed — {Holiday Name}"

## Scope (file)

- `src/components/dashboard/PinnedAnalyticsCard.tsx` — only the `case 'sales_overview':` branch inside the `if (compact)` block (~lines 412–423). No changes to the full/non-compact card.

## Closed-day detection logic

Add a small helper inside the compact branch, fed by data already in scope:

- `useLocations()` is already called → has `hours_json` + `holiday_closures` per location.
- `useUserLocationAccess()` already gives `accessibleLocations`.
- Reuse the existing `isClosedOnDate(hoursJson, holidayClosures, date)` helper from `src/hooks/useLocations.ts`.

Resolution:

- **Only evaluate when** `filters.dateRange === 'today'` (closure messaging is a today-only concept; historical periods should always show numbers).
- If `filters.locationId !== 'all'`: check that single location → if closed, render `{locationName} Closed{reason ? ' — ' + reason : ' — No Sales'}`.
- If `filters.locationId === 'all'`:
  - Determine the set of accessible locations.
  - If **every** accessible location is closed today → render `Locations Closed` (or `All Locations Closed — {Holiday}` if a single shared holiday name applies to all).
  - Otherwise render the normal three metrics (do **not** mention partial closures here — the rollup is the aggregate).

When closed: render the icon + label as today, and replace the metric stack with a single muted line (`text-sm text-muted-foreground`) carrying the closure message. No `$0.00` displayed. Subtext + footer link remain.

## Three-metric layout (open days)

Replace the current single `BlurredAmount` block in the `sales_overview` compact case with a vertical micro-stack:

```
Current Sales        $20.3K      ← BlurredAmount, font-display text-xl
Expected Sales       $24.1K      ← BlurredAmount, text-sm text-muted-foreground
Retail Attach Rate   38%         ← text-sm text-muted-foreground (no BlurredAmount — % is non-monetary)
```

Visual rules (per UI canon):

- Use `formatCurrencySmart` (already defined in this scope) for both currency rows so $20,263 → `$20.3K`.
- Each row is a `flex items-center justify-between` line with `tokens.kpi.label`-style mini-label on the left.
- Wrap currency values in `BlurredAmount` (privacy doctrine).
- Drop the existing `metricSubtext` ("$X expected today") since "Expected Sales" now lives as its own row.
- Keep `metricLabel` empty for this case (the row labels are self-describing) so we don't double up.

Data sources (already in scope, no new hooks):

- **Current Sales**: `isToday && todayActualData?.hasActualData ? todayActualData.actualRevenue : salesData?.totalRevenue ?? 0`. For non-today ranges this is just the period total.
- **Expected Sales**: `salesData?.totalRevenue ?? 0` (the booked/forecast figure already powering the existing tile). For non-today ranges this equals Current Sales — in that case **hide the Expected row** to avoid redundancy.
- **Retail Attach Rate**: `attachmentData?.attachmentRate` formatted via `formatPercent`. Show `--` if undefined.

## Render structure (compact branch only)

Inside the existing compact return block, conditionally swap the `<div className="mt-4 flex-1">…</div>` body for `sales_overview` with a small dedicated render. All other cards stay on the existing single-metric path.

Pseudocode shape:

```tsx
{cardId === 'sales_overview' ? (
  closedState ? (
    <p className="mt-4 text-sm text-muted-foreground">{closedState.message}</p>
  ) : (
    <div className="mt-4 space-y-1.5">
      <Row label="Current Sales"     value={<BlurredAmount …>{currentStr}</BlurredAmount>} primary />
      {showExpected && (
        <Row label="Expected Sales"  value={<BlurredAmount …>{expectedStr}</BlurredAmount>} />
      )}
      <Row label="Retail Attach"     value={attachStr} />
    </div>
  )
) : (
  /* existing single-metric block unchanged */
)}
```

## Edge cases

- **No POS data yet today** but location is open → show `Current Sales $0` and `Expected Sales` from bookings (don't trip the closed-state branch).
- **`locations` query still loading** → render the normal numeric path (don't flash a "Closed" state on cold load). Closed-state only fires when we have a definitive `hours_json` for every evaluated location.
- **Holiday closure for one location in an "all" view but others open** → treat as not-fully-closed (numbers shown).

## Out of scope

- Full/non-compact Sales Overview card (`AggregateSalesCard`) — unchanged.
- Other compact tiles (Daily Brief, Executive Summary, Retail Effectiveness) — unchanged, even though they share related data.
- Closed-day messaging on historical date ranges (today-only by design).

## Files to edit

- `src/components/dashboard/PinnedAnalyticsCard.tsx` (single case + small helper inside compact block)

## Memory updates

- Append a one-line clause to `mem://style/platform-ui-standards-and-privacy` codifying: "Sales Overview compact tile shows Current / Expected / Retail Attach; on closed days renders `{Scope} Closed[ — Reason]` instead of zeroed numbers."

---

### Prompt coaching (per your standing instructions)

**What worked well:** You named the exact card, the exact view (Simple), the three metrics in priority order, and gave concrete copy for two distinct closure cases. That's enough for a clean, single-pass implementation with no clarifying round-trip.

**Sharper next time:**
- Specify whether **Expected Sales** should ever show below Current (e.g. when Current already exceeds Expected — a "beat the day" signal), or always show as-is. I assumed "always show when today," "hide otherwise."
- Clarify whether holiday closures should display the holiday name (e.g. "Mesa Closed — Christmas Day") or stay generic ("Mesa Closed — No Sales"). I defaulted to "use holiday name when present."
- Mention whether retail attach should be the period attach rate or today-only — these can diverge. I'm using whatever's in scope (`filters.dateFrom..dateTo`), which matches the rest of the tile.

If you want any of those defaults flipped, say so on approval and I'll adjust before implementing.