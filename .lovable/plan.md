

## Add Visible "Excludes tips" Label to Total Revenue

The info tooltip already mentions tips are excluded, but it requires hovering to discover. This change adds a visible subtitle directly beneath the "Total Revenue" label so the exclusion is immediately clear without interaction.

### Change

**File: `src/components/dashboard/AggregateSalesCard.tsx` (line ~610-612)**

Update the "Total Revenue" label area to include a small muted note beneath it:

- Current: `Total Revenue (i)`
- Updated: `Total Revenue (i)` with a subtle line below reading "Excludes tips"

The note will use `text-xs text-muted-foreground/50` styling to keep it calm and secondary -- visible enough to clarify, but not competing with the primary label.

The existing MetricInfoTooltip description will also be refined to: "Combined net revenue from services and retail product sales for the selected period. Tips and gratuities are tracked separately and not included in this total."

This is a single-line UI addition with no logic changes.
