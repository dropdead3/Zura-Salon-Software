

## Remove All "Vish" References from Codebase

### Problem
"Vish" is a competitor brand name that appears in 6 files — tooltips, code comments, and a comparison table. It must be replaced with neutral, brand-appropriate language throughout.

### Changes

| File | Location | Change |
|------|----------|--------|
| `AllowanceCalculatorDialog.tsx` | Line 2, comment | "Vish-style bowl-based" → "Bowl-based" |
| `AllowanceCalculatorDialog.tsx` | Line 1088, tooltip | Rewrite to: "Calculated using the industry-standard 8% target: your after-markup product cost ÷ 0.08, rounded up to the nearest $5. You can also adjust service pricing from Price Intelligence in the Backroom Hub, or from the Services Configurator in Organization Settings." |
| `allowance-health.ts` | Lines 1–6, comment block | "Vish methodology" / "Vish standard" → "Industry-standard methodology" |
| `BackroomHistoryChart.tsx` | Line 4, comment | "Vish-style" → "Multi-metric" or remove reference |
| `DockLiveDispensing.tsx` | Line 5, comment | "Vish-inspired teardrop" → "Teardrop" |
| `DockIngredientDispensing.tsx` | Line 3, comment | "Vish-inspired" → remove modifier |
| `CompetitorComparison.tsx` | Throughout | Keep "Vish" here — this is an internal competitor comparison table that intentionally names competitors. **Unless you want this removed too.** |

### Tooltip Rewrite (user-facing, line 1088)

**Before:** "Calculated using the Vish 8% target: your after-markup product cost ÷ 0.08..."

**After:** "Calculated using the industry-standard 8% target: your after-markup product cost ÷ 0.08, rounded up to the nearest $5. You can also adjust service pricing from Price Intelligence in the Backroom Hub, or from the Services Configurator in Organization Settings."

### Note
The `CompetitorComparison.tsx` file is an intentional feature comparison table — "Vish" is used there as a named competitor column. This is appropriate for that context and can remain unless you'd prefer it changed too.

