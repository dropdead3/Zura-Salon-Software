

## Goal
Add a calm, advisory **performance indicator** at the bottom of the Revenue Breakdown card that translates the retail metrics (Retail %, True Retail %, Attach Rate) into one ranked verdict — embodying the doctrine "tell operators what to think about the numbers."

## Why this fits doctrine
- **Decision engine, not reporting** — the card already shows numbers; this adds the lever.
- **High-confidence, advisory tone** — verdict only renders when totals are material; silence otherwise.
- **No new data** — uses values already on the card, so zero query cost.
- **Persona-safe** — single line, no enterprise complexity exposed.

## Where
`src/components/dashboard/sales/RevenueDonutChart.tsx` — append a new block inside the metrics section (after the Attach Rate row, before closing `</div>` on line 188).

## Logic — `getRetailPerformanceVerdict`

Pure helper, defined in same file (or extracted to `src/lib/retailPerformance.ts` if reused later — recommend extracting now for the sibling cards that use the same metrics).

Inputs: `trueRetailPercent`, `retailAttachmentRate`, `total` (gate)

Materiality gate: if `total < $500` OR `retailAttachmentRate === undefined` → **return null** (silence is valid output, per visibility-contracts doctrine).

Tier thresholds (anchored to existing `StylistLevelsEditor` benchmark of 10–20% retail and industry attach rate norms of 30–50%):

| Tier | True Retail % | Attach Rate | Verdict copy |
|---|---|---|---|
| **Strong** | ≥ 15% | ≥ 40% | "Retail is pulling its weight. Protect the merchandising routine." |
| **Healthy** | 10–14% | 30–39% | "Retail is on benchmark. One coaching cycle could push to top quartile." |
| **Soft** | 5–9% | 15–29% | "Retail is underperforming. The lever is attach rate at checkout, not assortment." |
| **Critical** | < 5% | < 15% | "Retail is a margin leak. Audit the recommendation step in the service flow." |

Tier = the **lower** of the two metric tiers (worst-of, so we don't oversell when one is weak).

## UI — single advisory line

Inside the `border-t` metrics section, after Attach Rate row:

```tsx
{verdict && (
  <div className="pt-2 mt-1 flex items-start gap-2">
    <div className={cn(
      "w-1 self-stretch rounded-full shrink-0",
      verdict.tier === 'strong' && "bg-emerald-500/50",
      verdict.tier === 'healthy' && "bg-foreground/30",
      verdict.tier === 'soft' && "bg-amber-500/50",
      verdict.tier === 'critical' && "bg-red-500/50",
    )} />
    <p className="text-xs text-muted-foreground leading-relaxed">
      {verdict.copy}
    </p>
  </div>
)}
```

- Vertical color rail (1px wide) instead of badge — matches calm executive aesthetic.
- No emoji, no exclamation, no shame language ("underperforming" framed as a lever, not a failing).
- Copy is advisory-first and tells operator **what to do next**, not just what's wrong.

## Materiality / silence rules
- Render nothing if revenue total < $500 (data integrity gate)
- Render nothing if attach rate is loading or undefined
- Render nothing if `hasBreakdown` is false (need True Retail % for accurate tiering)

## Out of scope
- Sweeping the same verdict to Top Performers or other cards
- Persisting verdicts to alerts / weekly brief (that's Phase 2 advisory layer)
- Making thresholds org-configurable (use platform defaults; revisit when stylist_levels exposes per-org retail target)
- Changing the existing metric rows or donut

## Files
- **Modify**: `src/components/dashboard/sales/RevenueDonutChart.tsx` — add helper + verdict block
- **Optional extract**: `src/lib/retailPerformance.ts` — pure tier function (recommended; sibling Sales hub cards likely want it next)

