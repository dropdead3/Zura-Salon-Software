

## CLV Feature Gap Analysis

The CLV calculator and its integration points are functional but have several gaps worth closing before moving on.

---

### Gap 1: CLV Tier Badges Not Displayed Anywhere

`assignCLVTier()` is exported and imported in `ClientDetailSheet.tsx`, but no tier badge (Platinum/Gold/Silver/Bronze) is actually rendered in the UI. The tier config includes colors and labels, but they're unused visually. Owners can't quickly see which clients are their most valuable.

**Fix**: Add a compact CLV tier badge to:
- The CLV card in `ClientDetailSheet.tsx` (next to the lifetime value)
- The client row in `ClientDirectory.tsx` (replacing or augmenting the raw CLV number)

This requires computing all CLV values once to establish percentile rankings, then passing them through. A lightweight `useAllClientCLVs()` hook can cache the sorted array.

| File | Change |
|------|--------|
| New: `src/hooks/useAllClientCLVs.ts` | Fetch all clients' spend/visit/dates, compute CLV array for tier ranking |
| `ClientDetailSheet.tsx` | Render tier badge next to CLV value using `assignCLVTier` |
| `ClientDirectory.tsx` | Show tier badge inline with CLV on each row |

---

### Gap 2: Revenue-at-Risk Calculation Passes `null` for `firstVisit`

In `ClientHealthSummaryCard.tsx` line 73, the call is:
```ts
calculateCLV(c.total_spend, c.visit_count, null, c.last_visit)
```

Passing `null` for `firstVisit` means any client with only 1 visit won't get a reliable CLV (correct), but clients with 2+ visits also get `isReliable: false` because the function requires `firstVisit` to be non-null. The `HealthClient` interface already has `first_visit` -- it's just not being passed.

**Fix**: Change `null` to `c.first_visit` on that line.

| File | Change |
|------|--------|
| `ClientHealthSummaryCard.tsx` | Pass `c.first_visit` instead of `null` |

---

### Gap 3: `formatCLVValue` Hardcodes "$" Symbol

The function returns `$${value}` regardless of org currency. Every other monetary display uses `useFormatCurrency()` for proper locale/currency. This means non-USD organizations see mixed currency symbols.

**Fix**: Either remove `formatCLVValue` and replace all usages with `formatCurrencyCompact` from the existing `useFormatCurrency` hook, or make `formatCLVValue` accept a currency parameter.

| File | Change |
|------|--------|
| `clv-calculator.ts` | Remove `formatCLVValue` or make currency-aware |
| `ClientDetailSheet.tsx` | Use `formatCurrencyWhole` / `formatCurrencyCompact` instead |
| `ClientDirectory.tsx` | Same replacement |

---

### Gap 4: Client Health Hub Table Has No CLV Column

The `ClientSegmentTable.tsx` shows Name, Email, Phone, Last Visit, Days Inactive, and Total Spend -- but no CLV or tier. When an owner is deciding which at-risk clients to reach out to first, CLV ranking is the most important signal.

**Fix**: Add a CLV column (sortable) and tier badge to `ClientSegmentTable`. This makes the outreach prioritization data-driven.

| File | Change |
|------|--------|
| `ClientSegmentTable.tsx` | Add CLV column with tier badge, make sortable |

---

### Gap 5: "Client Lifetime Value" Report Is a Stub

The Reports Hub lists a "Client Lifetime Value" report (`lifetime-value`), but `ClientRetentionReport.tsx` handles it with a generic fallback -- it doesn't actually generate CLV-specific content. This is a dead link.

**Fix**: Wire the `lifetime-value` report type to generate a proper CLV report: top clients ranked by CLV with tier distribution, average CLV by segment, and total portfolio value.

| File | Change |
|------|--------|
| `ClientRetentionReport.tsx` | Add CLV-specific report generation for `lifetime-value` type |

---

### Gap 6: No CLV on Executive Brief or AI Insights

The weekly intelligence brief and AI insights don't reference CLV data. Adding a "Top 10 clients by CLV represent X% of revenue" or "Revenue at risk from lapsing high-CLV clients: $X" would make the brief significantly more actionable.

This is lower priority and can be deferred to when the executive brief is next enhanced.

---

### Recommended Implementation Order

| Priority | Fix | Effort | Impact |
|----------|-----|--------|--------|
| 1 | Fix `firstVisit` null bug (Gap 2) | Trivial | Fixes broken revenue-at-risk calculation |
| 2 | Replace hardcoded "$" with org currency (Gap 3) | Small | Correctness for non-USD orgs |
| 3 | Add CLV tier badges to detail sheet + directory (Gap 1) | Small | Visual payoff -- clients feel categorized |
| 4 | Add CLV column to Health Hub table (Gap 4) | Small | Outreach prioritization becomes data-driven |
| 5 | Wire CLV report in Reports Hub (Gap 5) | Medium | Completes the feature loop |
| 6 | CLV in executive brief (Gap 6) | Defer | Enhancement for later pass |

Gaps 1-4 can all ship in a single pass. Gap 5 is a standalone enhancement. Gap 6 is deferred.

