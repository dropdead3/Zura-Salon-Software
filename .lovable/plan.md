# Promo Attribution: Future-proof now, defer the dashboard card

Two cheap structural moves that close the data gap without prematurely shipping a single-source analytics card. When a second redemption surface arrives (or Marketing OS Phase 2 begins), the analytics card becomes a thin read layer over data we're already capturing.

## What we're building

### 1. Persist `revenue_attributed` on every popup-driven redemption

`promotion_redemptions.revenue_attributed` already exists on the table (`numeric`, nullable) but the popup write-path leaves it null. That means today we know a redemption *happened* but not what it was *worth* — a future analytics card would have to retro-join `appointments` → transactions, which is slow and gets fragile the moment voids/refunds enter the picture.

Stamp it at the moment of write, using the appointment's `final_amount` (already computed for the redemption row). This locks in the value at booking time — the operator's intent — independent of later modifications.

### 2. Surface "Lifetime revenue attributed" on the editor card

One stat next to the existing redemption count, wrapped in `BlurredAmount` per privacy doctrine. Keeps the loop in-context where the operator already is, instead of forcing a dashboard trip for a single-surface metric.

Format: `$1,240 attributed · 8 redemptions · ↑ 2 in last 24h`

### 3. Register the analytics-card deferral

Add a row to the Deferral Register in `mem://architecture/visibility-contracts.md` so this decision is recoverable months from now and auto-revisits when the trigger fires.

| Item | Revisit trigger |
|---|---|
| Promo Analytics Hub card | Second redemption surface ships (campaign/QR/SMS) **OR** any org accumulates ≥30 days × ≥10 popup redemptions |

## What we're explicitly NOT building

- No new Analytics Hub card. Single-surface attribution is noise, not signal — fails the materiality gate per Visibility Contracts.
- No retro-join script. `revenue_attributed` populates forward-only; existing nulls stay null. Honest absence beats fabricated history.
- No revenue-per-popup ranking, no decay alerts, no cross-org benchmarks. All Phase 2+ once Marketing OS exists.

## Technical details

**Edge function** (`supabase/functions/create-public-booking/index.ts`, ~line 350):
- Add `revenue_attributed: finalPrice ?? basePrice ?? null` to the `promotion_redemptions` insert payload
- Rationale comment: "Stamp at booking time — represents the operator's marketing intent, not post-edit reality. Voids/refunds tracked separately."

**Hook** (`src/hooks/usePromotionalPopupRedemptions.ts`):
- Extend the count query to also `sum(revenue_attributed)` for the same `surface = 'promotional_popup'` + `promo_code_used` scope
- Return shape gains `revenueAttributed: number` (cents kept as numeric, displayed via `formatCurrency`)
- Silence rule preserved: if no rows, returns `0` — never a fabricated estimate

**Editor card** (`src/components/dashboard/website-editor/PromotionalPopupEditor.tsx`):
- Render the new stat inline with the existing count + last-24h chip
- Wrap in `<BlurredAmount>` per the privacy core rule
- Token: `tokens.kpi.label` for the "Attributed" label (Termina), `tokens.kpi.value` for the number

**Memory update** (`mem://architecture/visibility-contracts.md`):
- Append the deferral row above; no other content changes

## Files touched

- `supabase/functions/create-public-booking/index.ts` — one-line payload addition + comment
- `src/hooks/usePromotionalPopupRedemptions.ts` — extend query + return shape
- `src/components/dashboard/website-editor/PromotionalPopupEditor.tsx` — render new stat with `BlurredAmount`
- `mem://architecture/visibility-contracts.md` — Deferral Register entry

No migration required (column already exists). No new edge function. No new RLS policy.