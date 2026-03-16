

# Add Estimates Disclaimer to Backroom Paywall

## What
Add a clear, visible disclaimer near the "Your Salon's Numbers" section and the sticky calculator explaining that all figures are estimates based on scheduled appointments and estimated booking capacity — not guaranteed results.

## Changes — `BackroomPaywall.tsx` only

1. **Below the "Your Salon's Numbers" metrics card**: Add a subtle info banner with an `Info` icon stating the data source and estimation nature.

2. **In the sticky calculator** (shared `calculatorContent`): Add a small disclaimer footer below the "Supply fee recovery" footnote, reinforcing that projections are estimates.

### Disclaimer copy:
- Metrics card: _"These figures are estimates based on your current scheduled appointments and estimated booking capacity. Actual results may vary based on scheduling changes, client retention, and service mix."_
- Calculator savings section: _"All savings and revenue projections are estimates and not guaranteed."_

### Approach:
- Use an `Info` icon + muted text styling consistent with existing footnotes
- Wrap in a subtle `bg-muted/20 border border-border/30 rounded-lg p-3` container to distinguish it from metrics
- Appears regardless of whether data is real or manual/industry-based

