

## Fix Breakdown Row Hover Highlights

**Problem:** The rows use `px-3 -mx-3` — the negative margin extends the hit area but the rounded corners get clipped by the parent's `overflow-hidden`. The content also sits flush against the highlight edges because the padding is consumed by the negative-margin offset.

**Solution:** Remove the negative-margin hack. Instead, add padding to the rows naturally and compensate by removing padding from the parent container so the rows still align with the card edges.

### Changes — `src/components/dashboard/AggregateSalesCard.tsx`

**Services breakdown rows (line 1057):**
- Change parent `div` from `space-y-2 text-left` → `space-y-1 text-left -mx-1` (slight negative margin on the container only, so rows can breathe)

**Services row (line 1061):**
- Change from `rounded-lg px-3 py-2 -mx-3` → `rounded-xl px-3 py-2.5 hover:bg-muted/50 transition-colors`

**Retail breakdown rows (line 1119):**
- Same parent change: `space-y-2 text-left` → `space-y-1 text-left -mx-1`

**Retail row (line 1126):**
- Change from `rounded-lg px-3 py-2 -mx-3 transition-colors hover:bg-muted/60` → `rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50`

This gives each row proper inner padding within the highlight, visible rounded corners, and consistent hover styling across both breakdowns.

