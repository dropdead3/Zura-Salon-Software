

# Slim Down Zura Guardrails — Stop Blocking Stripe-Approved Capital

## Rationale

Stripe is the lender and underwriter. When Stripe approves a financing offer, they have already evaluated risk, repayment capacity, and account health. Zura adding 7 hard gates on top means Zura is overriding Stripe's lending decision — which is not Zura's role.

Zura's role is to **surface** Stripe-approved offers with operational context, not to second-guess the underwriter.

## Proposed Change

Reduce from 7 hard-gating guardrails to **1 hard gate + 2 advisory warnings**.

### Keep as Hard Gate (1)
- **No Critical Ops Alerts** — This is genuinely Zura-specific. If the org has unresolved critical operational issues (margin breach, utilization collapse), surfacing a capital offer without context would be irresponsible. But this is about *timing*, not *eligibility*.

### Demote to Advisory Warnings (2)
- **Active Repayment Distress** — Show a warning banner: "This organization has active repayment concerns. Review before proceeding." Don't block.
- **Max Concurrent Projects** — Show an info note: "This organization has N active funded projects." Let the operator decide.

### Remove Entirely (4)
- **No Underperforming Projects** — Stripe already approved the offer knowing the account's full history. Blocking capital that could fix underperformance is counterproductive.
- **Decline Cooldown (14d)** — Stripe already enforces a 30-day cooldown after rejection. Zura's 14-day cooldown is redundant and shorter than Stripe's own.
- **Underperformance Cooldown (30d)** — Punitive and not Zura's call as a non-lender.
- **No Underperforming Projects count** — Redundant with the removal above.

## Architecture After Change

```text
Layer 1: Stripe Capital Underwriting (8 criteria, unchanged)
Layer 2: Zura Operational Context
  Hard gate:  Critical ops alerts (timing protection)
  Advisory:   Repayment distress warning (informational)
  Advisory:   Concurrent project count (informational)
```

## File Changes

| File | Change |
|---|---|
| `src/config/capital-engine/capital-formulas-config.ts` | Slim `ZURA_OPERATIONAL_GUARDRAILS` from 7 items to 1 gate + 2 advisories; update `DEFAULT_CAPITAL_POLICY` |
| `src/lib/capital-engine/capital-formulas.ts` | Update `calculateOperationalReadiness` — only critical ops alerts blocks; repayment distress and concurrent projects return warnings instead of failures |
| `src/pages/dashboard/platform/CapitalControlTower.tsx` | Update Layer 2 UI to show 1 gate + 2 advisories with distinct visual treatment (blocker vs. warning vs. info) |
| `src/hooks/useOrgCapitalDiagnostics.ts` | Update diagnostics to reflect slimmed guardrails |
| `src/hooks/useZuraCapital.ts` | Update operational readiness consumption to handle advisories vs. blockers |
| `src/pages/dashboard/platform/CapitalKnowledgeBase.tsx` | Update documentation to explain the lighter guardrail philosophy |

## UI Treatment

- **Hard gate** (critical ops): Red shield icon, blocks surfacing
- **Advisory warning** (repayment distress): Amber warning icon, shown but does not block
- **Advisory info** (concurrent projects): Blue info icon, contextual only

Policy line updates from:
> "Max 2 concurrent projects · 14d decline cooldown · 30d underperformance cooldown"

To:
> "Capital offers are surfaced when no critical operational alerts are active. Repayment and project context is shown as advisory information."

