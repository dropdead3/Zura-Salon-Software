/**
 * REPUTATION_PRICING_SHEET — Single source of truth for the Zura Reputation
 * commercial offer. All sales / billing / platform-console surfaces MUST
 * read from this constant. Hardcoding $49 / $19 / Stripe IDs elsewhere is
 * a doctrine violation (mirrors Platform Identity Tokenization).
 *
 * Memory: mem://features/reputation-subscription-gating
 *         mem://features/reputation-per-location-metering-scope
 */

export const REPUTATION_STRIPE = {
  productId: 'prod_URkzrlcyaai891',
  retentionCouponId: 'l1tzNWQq',
} as const;

export const REPUTATION_PRICING_SHEET = {
  baseSku: {
    name: 'Zura Reputation',
    monthlyPrice: 49, // USD per first location
    trialDays: 14,
    description:
      'Auto-requests reviews from recent clients, curates SEO-grade testimonials onto the website, throttles to protect operator brand.',
  },
  perLocationAddOn: {
    monthlyPrice: 19,
    status: 'deferred' as const,
    eta: 'Q3',
    note:
      'Per-location quantity billing is scoped but deferred until per-location reputation analytics ship. Quote first location only today.',
  },
  retentionCoupon: {
    id: REPUTATION_STRIPE.retentionCouponId,
    label: '$20 off × 3 months',
    rules:
      'Applied once per organization, gated by retention_coupon_applied_at on reputation_subscriptions. Authorized for use only when an Account Owner clicks Cancel inside the customer portal.',
  },
  graceWindow: {
    days: 30,
    behavior:
      'past_due → auto-cancel after 30 days. Curated website testimonials hide automatically on lapse and re-publish on resubscribe.',
  },
  refundPolicy:
    'No prorated refunds. Cancellations end at current_period_end. Disputes route to platform-payments-health for review.',
  authorizedDiscounts: ['retention coupon (l1tzNWQq) only'] as const,
} as const;

export type ReputationPricingSheet = typeof REPUTATION_PRICING_SHEET;
