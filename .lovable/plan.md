

## Transactions Drill-Down: Design Rule Violations

The screenshot shows several violations of the typography and design token rules in the transactions drill-down panels. Here is what needs to be fixed.

### Violations Identified

**1. ClientTypeSplitPanel -- Uppercase on font-sans (3 instances)**

Lines 44, 48, 54 in `ClientTypeSplitPanel.tsx`: The KPI sub-labels ("VISITS", "AVG TICKET", "REVENUE") use `text-[10px] uppercase tracking-wide text-muted-foreground` without `font-display`. The design system rule states: uppercase is only permitted with `font-display` (Termina). Using uppercase on the default `font-sans` (Aeonik Pro) is prohibited.

**Fix:** Add `font-display` to these labels, or use `tokens.kpi.label` which already includes `font-display text-[11px] font-medium text-muted-foreground uppercase tracking-wider`.

**2. ClientTypeSplitPanel -- Section header uses font-sans with uppercase**

Line 92: `text-xs tracking-[0.15em] uppercase text-muted-foreground font-medium` -- missing `font-display`. Section headers that are uppercase must use Termina.

**Fix:** Add `font-display` class.

**3. TransactionsByHourPanel -- Section header uses font-sans with uppercase**

Line 48: `text-xs tracking-wide uppercase text-muted-foreground font-medium` -- same violation. Missing `font-display`.

**Fix:** Add `font-display` class.

**4. ClientTypeSplitPanel -- Segment title uses plain font-medium**

Line 38: `text-sm font-medium` on segment labels ("New Clients", "Returning Clients"). This is technically allowed (font-medium is max weight), but these are card-level subheadings and would benefit from `font-display` for consistency with the rest of the dashboard card hierarchy.

**Fix:** Optional -- add `font-display` to segment titles for visual consistency.

### Files Changed

| File | Change |
|---|---|
| `src/components/dashboard/sales/ClientTypeSplitPanel.tsx` | Add `font-display` to section header (line 92), KPI sub-labels (lines 44, 48, 54), and optionally segment titles (line 38) |
| `src/components/dashboard/sales/TransactionsByHourPanel.tsx` | Add `font-display` to section header (line 48) |

### What Does NOT Change

- Data logic, hooks, and filter propagation remain untouched
- Layout structure (grid, spacing, progress bars) stays the same
- BlurredAmount privacy wrapping stays intact
- Animation behavior stays the same

