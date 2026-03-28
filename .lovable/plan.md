

## Problem

In `TicketDistributionPanel.tsx` and `AvgTicketByStylistPanel.tsx`, several uppercase labels use the default font (Aeonik Pro) instead of `font-display` (Termina). Visible violations from the screenshot:

- "TICKET DISTRIBUTION" — line 36
- "MEDIAN", "AVERAGE", "ABOVE AVG" — lines 52, 59, 66
- "AVG TICKET BY STYLIST" — `AvgTicketByStylistPanel.tsx` line 131

## Plan

**File: `src/components/dashboard/sales/TicketDistributionPanel.tsx`**

1. **Line 36** — Section label: Add `font-display` to the span class
2. **Lines 52, 59, 66** — Stat labels ("Median", "Average", "Above Avg"): Add `font-display` to each `<p>` class

**File: `src/components/dashboard/sales/AvgTicketByStylistPanel.tsx`**

3. **Line 131** — Section label: Add `font-display`, normalize tracking from `tracking-[0.15em]` to `tracking-wide`

### Files modified
- `src/components/dashboard/sales/TicketDistributionPanel.tsx`
- `src/components/dashboard/sales/AvgTicketByStylistPanel.tsx`

