

# Economics Tab — Bug Fixes & Gaps

## Bugs Found

### 1. AI Optimizer Error Messages Lost (429/402 swallowed)
`supabase.functions.invoke` wraps non-2xx responses in a generic `FunctionsHttpError` — the friendly error messages from the edge function ("Rate limit exceeded", "AI credits exhausted") are never surfaced. The toast just shows "Edge Function returned a non-2xx status code."

**Fix:** Replace `supabase.functions.invoke` with a direct `fetch` call (same pattern as `ai-insight-service.ts` already uses in this codebase). This gives access to the response status and body directly.

### 2. No Input Validation on Assumptions
Users can enter negative overhead, margins > 100%, or product cost > 100%. These cause `Infinity`, `NaN`, or division-by-zero in `computeEconomics`. No guard prevents saving nonsensical values.

**Fix:** Clamp inputs in `handleAssumptionChange`: overhead ≥ 0, percentages between 0–1 (0%–100%). Also add a guard in `computeEconomics` to return `Infinity` when `variableCostRate ≥ 1`.

### 3. Local `formatCurrency` Shadows Design System
The component defines its own `formatCurrency` (line 70) instead of using `@/lib/format.ts`. This skips the org's currency setting and `BlurredAmount` integration.

**Fix:** Remove the local function, import `formatCurrency` from `@/lib/format.ts` with `noCents: true` option.

### 4. Assumption Save Doesn't Provide Feedback
`handleSaveAssumptions` calls `saveAssumptions` but shows no success toast. Users don't know if their save worked.

**Fix:** Add a success toast after save.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/settings/CommissionEconomicsTab.tsx` | Fix AI fetch (use direct fetch instead of invoke), input validation, import formatCurrency from design system, add save toast |
| `src/hooks/useCommissionEconomics.ts` | Add guard for variableCostRate ≥ 1 in computeEconomics |

**2 files. No new files. No database changes.**

