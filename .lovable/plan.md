

# Backroom Pricing — Competitive Analysis & Recommendation

## Competitor Pricing Breakdown

### Vish (prices in GBP, ~1.27 USD)

| Plan | Monthly | Stylists | Scales Included | Scale Hardware |
|------|---------|----------|-----------------|----------------|
| Solo | £30 (~$38) | 1 | 1 | £165 (~$210) each, sold separately |
| Starter | £80 (~$102) | 2 | 1 | Same |
| Vish 5 | £130 (~$165) | 2-5 | 1 | Same |
| Vish 10 | £185 (~$235) | 6-10 | 2 | Same |
| Vish 20 | £240 (~$305) | 11+ | 3+ | Same |
| Enterprise | Custom | Multi-location | 3+ | Same |

Also requires a tablet (iPad/Android) per scale. Separate onsite training fee.

### SalonScale (USD)

| Plan | Monthly | Annual | Stylists | Scale |
|------|---------|--------|----------|-------|
| Solo | $49/mo | $499/yr ($42/mo) | 1 | Free with annual; not included monthly |
| Essentials | $99/mo | $1,009/yr ($84/mo) | Up to 3 | Free with annual |
| Signature | $149/mo | $1,520/yr ($127/mo) | Up to 7 | Free with annual |
| Luxe | $199/mo | $2,030/yr ($169/mo) | Unlimited | Free with annual |

Monthly plans do NOT include a scale. Annual plans include 1 free precision scale per plan.

---

## What Zura Backroom Offers That Competitors Don't

Both Vish and SalonScale are **standalone** products — they only do color weighing and cost tracking. Zura Backroom is embedded inside a full salon management platform, which means:

- **Supply AI** — Gemini-powered waste insights, reorder risk, margin opportunities (neither competitor has AI)
- **Ghost loss detection** — automated shrinkage analysis vs. just tracking what was dispensed
- **Predictive demand forecasting** — 1d/7d projections with tap-to-reorder
- **Cost spike alerts & weekly digest emails** — proactive, not reactive
- **Recipe management with leftover tracking** — not just what was mixed, but what was wasted
- **Full integration with appointments, staff, and services** — margin-per-appointment analytics that neither competitor can do because they don't own the booking data

## Waste Savings Math (for ROI messaging)

Industry data: salons waste 20-40% of color product. A typical salon spends $2,000-$5,000/mo on color products.

```text
Conservative estimate (mid-size salon):
  Monthly color spend:         $3,000
  Typical waste rate:          25% = $750/mo wasted
  Backroom reduction target:   50% waste reduction
  Monthly savings:             $375/mo
  Annual savings:              $4,500/yr
```

Even at $99/mo, the salon saves $276/mo net. The product pays for itself 3-4x over.

---

## Recommended Zura Backroom Pricing

**Strategy: Undercut SalonScale on the low end, match on the mid-tier, and win on value at the top — while keeping the base+scale model.**

| Plan | Monthly | Stylists | Scales Included | Key Differentiator |
|------|---------|----------|-----------------|--------------------|
| **Starter** | $39/mo | 1-3 | Software only | Cheapest entry; ~20% under SalonScale Solo |
| **Professional** | $79/mo | 4-10 | Software only | ~20% under SalonScale Essentials/Signature |
| **Unlimited** | $129/mo | Unlimited | Software only | ~35% under SalonScale Luxe |

**Add-ons:**
| Item | Price | Notes |
|------|-------|-------|
| Acaia Pearl Scale | $199 one-time | $150 cost + $49 margin (~33% markup) |
| Additional scale license | $10/mo per scale | Software license for each connected scale |

**Annual discount:** 15% off monthly (matches SalonScale's annual discount), which also includes 1 free scale per plan.

### Why This Works

1. **Competitive entry point.** $39 vs SalonScale's $49 and Vish's ~$38. Undercuts or matches both at the solo level, but Zura includes AI insights neither has.

2. **Mid-tier sweet spot.** $79 for up to 10 stylists vs SalonScale's $99 (3 stylists) or $149 (7 stylists). Massive value advantage.

3. **Unlimited is genuinely cheaper.** $129 vs $199 (SalonScale Luxe) and ~$305 (Vish 20). A 20-stylist salon saves $70-$176/mo vs competitors.

4. **Scale margin.** $49 margin per Acaia Pearl sold. If an average salon buys 2 scales, that's $98 hardware profit per onboarding.

5. **Annual lock-in incentive.** Free scale with annual plan means the salon gets $199 in hardware value, Zura's cost is $150, offset by guaranteed 12-month retention.

6. **The real moat is integration.** Competitors can't show margin-per-appointment because they don't own the booking stack. This justifies pricing parity even though Backroom is an add-on, not a standalone product.

### Revenue Projections

```text
100 salons on Professional ($79/mo):
  Software MRR:          $7,900
  Avg 2 scales each:     $2,000/mo scale licenses ($10 x 2 x 100)
  Total MRR:             $9,900
  Hardware revenue:       $39,800 one-time (200 scales x $199)
  Hardware profit:        $9,800 one-time (200 x $49 margin)
```

---

## Implementation Changes

The current checkout function creates a single $49 flat product. To implement this:

1. **Create 3 Stripe products** (Starter, Professional, Unlimited) with monthly + annual prices
2. **Create scale add-on product** ($10/mo recurring, quantity-based)
3. **Create scale hardware product** ($199 one-time)
4. **Update checkout edge function** to accept plan selection + scale quantity, build multi-line-item session
5. **Redesign paywall UI** with plan comparison cards, scale quantity picker, and live price calculator
6. **Update webhook** to store plan tier + scale count in feature flags metadata

