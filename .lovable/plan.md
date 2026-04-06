

# AI Commission Rate Optimizer + Economics Tab Hardening

## What This Delivers

An "Optimize Rates" button on the Economics tab that sends the current level structure, assumptions, and actual revenue data to an AI edge function. The AI returns specific recommended commission rates per level that hit the owner's target margin while staying competitive with industry benchmarks. Results render inline on the Economics tab with one-click "Apply" to push recommended rates into the What-If simulator.

Additionally: bug fixes and enhancements found during review.

---

## Bugs and Gaps Found

1. **No AI recommendation capability** — the Economics tab is purely manual; no intelligence surfaces to suggest what rates *should* be
2. **What-If has no "Apply to levels" path** — slider adjustments are throwaway; there is no way to commit what-if rates back to the actual level configuration
3. **Missing retail commission in economics math** — `computeEconomics` only uses `serviceCommissionRate`; retail commission is a real cost that should factor into margin calculations
4. **Revenue note is misleading** — says "annualized to monthly" but the code divides by 3 (correct for 90 days → monthly); the copy should just say "monthly average from trailing 90 days"

---

## Implementation

### 1. New Edge Function: `ai-commission-optimizer`

Creates `supabase/functions/ai-commission-optimizer/index.ts`:
- Receives: levels (with current rates), assumptions (overhead, product cost, target margin), actual revenue per level, stylist counts
- System prompt includes industry benchmarks (same as `ai-level-analysis`) plus margin math context
- Uses tool-calling to return structured output:
  ```
  {
    recommendations: [{
      level_slug: string,
      current_service_rate: number,
      recommended_service_rate: number,
      current_retail_rate: number,
      recommended_retail_rate: number,
      rationale: string,
      projected_margin_at_current_revenue: number
    }],
    summary: string,
    confidence: "high" | "medium" | "low"
  }
  ```
- Handles 429/402 errors properly

### 2. Update `CommissionEconomicsTab.tsx`

- Add "Optimize with Zura" button in the Economics table card header (right side, pill style per `tokens.button.cardAction`)
- On click: calls the edge function with current data
- Results render in a new card below the economics table:
  - Summary banner with confidence badge
  - Per-level recommendation rows showing current → recommended rate with rationale
  - "Apply to What-If" button that pushes all recommended rates into the What-If slider state
- Fix the revenue footnote copy

### 3. Fix Retail Commission Gap in Math

Update `computeEconomics` and `computeMarginAtRevenue` in `useCommissionEconomics.ts`:
- Accept `retailCommissionRate` as a parameter
- Include it in `variableCostRate = serviceCommissionRate + retailCommissionRate + product_cost_pct`
- Update the table to show blended commission impact

### 4. Update Economics Table Columns

- Add "Retail %" column (already in the header but using only service rate in the math)
- Pass both rates through to `computeEconomics`

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/ai-commission-optimizer/index.ts` | **New** — AI rate optimization edge function |
| `src/components/dashboard/settings/CommissionEconomicsTab.tsx` | Add Optimize button, AI results card, fix footnote, pass retail rate |
| `src/hooks/useCommissionEconomics.ts` | Add `retailCommissionRate` to math functions, export types for AI response |

**3 files. 1 new edge function. No database changes.**

