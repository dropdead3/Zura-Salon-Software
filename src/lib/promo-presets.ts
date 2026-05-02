/**
 * Promotional Popup — curated preset catalog.
 *
 * Each preset is a *partial* `PromotionalPopupSettings` covering only the
 * content + offer slots (eyebrow, headline, body, CTA labels, disclaimer,
 * value anchor, eyebrowIcon, offerCode placeholder).
 *
 * Behavior/targeting/style fields (`enabled`, `appearance`, `trigger`,
 * `showOn`, `audience`, `startsAt`, `endsAt`, `frequency`, `accentColor`,
 * etc.) are intentionally NOT touched. Applying a preset never silently
 * enables a popup, switches its appearance, or changes who sees it. The
 * operator stays in control of those decisions.
 *
 * The `promo-presets.test.ts` lock validates this contract.
 */
import type {
  PromotionalPopupSettings,
  EyebrowIcon,
} from '@/hooks/usePromotionalPopup';

/** Subset of fields a preset is allowed to set. Locked by tests below. */
export type PromoPresetContent = Pick<
  PromotionalPopupSettings,
  | 'eyebrow'
  | 'eyebrowIcon'
  | 'headline'
  | 'body'
  | 'ctaAcceptLabel'
  | 'ctaDeclineLabel'
  | 'disclaimer'
  | 'valueAnchor'
  | 'offerCode'
>;

export type PromoPresetCategory =
  | 'acquisition'
  | 'retention'
  | 'utilization'
  | 'seasonal';

export interface PromoPreset {
  key: string;
  label: string;
  category: PromoPresetCategory;
  /** One-line "when to use it" hint shown beneath the preset row. */
  rationale: string;
  content: PromoPresetContent;
}

/** Source-of-truth catalog. Add new archetypes here. */
export const PROMO_PRESETS: PromoPreset[] = [
  {
    key: 'new-client-discount',
    label: 'New Client Welcome',
    category: 'acquisition',
    rationale: 'First-visit discount for visitors who have never booked.',
    content: {
      eyebrow: 'New here?',
      eyebrowIcon: 'sparkles' as EyebrowIcon,
      headline: 'Welcome — 20% off your first visit',
      body: 'Book your first appointment with us and save on any service. We can\'t wait to meet you.',
      ctaAcceptLabel: 'Claim 20% off',
      ctaDeclineLabel: 'Maybe later',
      disclaimer: 'New clients only. One use per guest. Cannot be combined with other offers.',
      valueAnchor: 'Save 20%',
      offerCode: 'WELCOME20',
    },
  },
  {
    key: 'complimentary-addon',
    label: 'Complimentary Add-On',
    category: 'acquisition',
    rationale: 'Free service paired with any paid booking — high perceived value.',
    content: {
      eyebrow: 'Limited time offer',
      eyebrowIcon: 'gift' as EyebrowIcon,
      headline: 'Free add-on with any service',
      body: 'Book any appointment this month and your add-on is on us — no code needed at checkout.',
      ctaAcceptLabel: 'Claim Offer',
      ctaDeclineLabel: 'No thanks',
      disclaimer: 'New clients only. Cannot be combined with other offers. Mention code at booking.',
      valueAnchor: '$45 value',
      offerCode: 'FREEADDON',
    },
  },
  {
    key: 'referral-bonus',
    label: 'Referral Reward',
    category: 'retention',
    rationale: 'Reward existing guests for bringing a friend — compounds your book.',
    content: {
      eyebrow: 'Refer a friend',
      eyebrowIcon: 'gift' as EyebrowIcon,
      headline: 'Give $25, Get $25',
      body: 'Send a friend our way and you both get $25 toward your next visit when they book.',
      ctaAcceptLabel: 'Send a referral',
      ctaDeclineLabel: 'Not now',
      disclaimer: 'Credit applies after the friend\'s first completed appointment. One referral per visit.',
      valueAnchor: '$50 total value',
      offerCode: 'REFER25',
    },
  },
  {
    key: 'birthday-month',
    label: 'Birthday Month Gift',
    category: 'retention',
    rationale: 'Birthday-month perk that drives goodwill and a guaranteed visit.',
    content: {
      eyebrow: 'It\'s your month',
      eyebrowIcon: 'sparkles' as EyebrowIcon,
      headline: 'Happy birthday — enjoy 15% off',
      body: 'Celebrate with us this month. Your birthday discount is waiting on any service you book.',
      ctaAcceptLabel: 'Book my treat',
      ctaDeclineLabel: 'Maybe later',
      disclaimer: 'Valid during birthday month only. One use per guest.',
      valueAnchor: 'Save 15%',
      offerCode: 'BDAY15',
    },
  },
  {
    key: 'weekday-fill',
    label: 'Midweek Fill',
    category: 'utilization',
    rationale: 'Tue–Thu only — recovers utilization on your softest days.',
    content: {
      eyebrow: 'Midweek special',
      eyebrowIcon: 'clock' as EyebrowIcon,
      headline: '15% off Tuesday–Thursday',
      body: 'Book midweek and save. Same service, same chair — quieter days, lower price.',
      ctaAcceptLabel: 'Find a midweek slot',
      ctaDeclineLabel: 'No thanks',
      disclaimer: 'Valid Tuesday through Thursday only. Cannot be combined with other offers.',
      valueAnchor: 'Save 15%',
      offerCode: 'MIDWEEK15',
    },
  },
  {
    key: 'holiday-gift-card',
    label: 'Gift Card Promo',
    category: 'seasonal',
    rationale: 'Bonus value on gift cards — drives Q4 cash + Q1 visits.',
    content: {
      eyebrow: 'Limited time',
      eyebrowIcon: 'gift' as EyebrowIcon,
      headline: 'Buy $100, Get $20 Free',
      body: 'Gift cards are the perfect present. Buy any $100 card and we\'ll add a $20 bonus.',
      ctaAcceptLabel: 'Buy a gift card',
      ctaDeclineLabel: 'Not now',
      disclaimer: 'Bonus card valid for 90 days from purchase. Limit 5 per guest.',
      valueAnchor: '$20 bonus',
      offerCode: 'GIFT20',
    },
  },
  {
    key: 'winback-lapsed',
    label: 'We Miss You',
    category: 'retention',
    rationale: 'Reactivation offer for lapsed guests — small discount, big signal.',
    content: {
      eyebrow: 'We miss you',
      eyebrowIcon: 'sparkles' as EyebrowIcon,
      headline: 'Come back — 10% off your next visit',
      body: 'It\'s been a while. We\'d love to see you again. Your discount is ready when you are.',
      ctaAcceptLabel: 'Book my comeback',
      ctaDeclineLabel: 'Not yet',
      disclaimer: 'Valid for guests who haven\'t visited in 90+ days. One use per guest.',
      valueAnchor: 'Save 10%',
      offerCode: 'COMEBACK10',
    },
  },
  {
    key: 'flash-24h',
    label: '24-Hour Flash',
    category: 'utilization',
    rationale: 'Hard-deadline urgency — best for quick utilization recovery.',
    content: {
      eyebrow: 'Today only',
      eyebrowIcon: 'zap' as EyebrowIcon,
      headline: '24-hour flash — 25% off',
      body: 'Book any service in the next 24 hours and save 25%. The clock is ticking.',
      ctaAcceptLabel: 'Book now',
      ctaDeclineLabel: 'Skip',
      disclaimer: 'Booking must be completed within 24 hours of code use. Service date can be later.',
      valueAnchor: 'Save 25%',
      offerCode: 'FLASH25',
    },
  },
];

/** Lookup helper. Returns `null` when key is unknown — silence is valid. */
export function getPromoPreset(key: string): PromoPreset | null {
  return PROMO_PRESETS.find((p) => p.key === key) ?? null;
}

/**
 * The exact set of `PromotionalPopupSettings` keys a preset is allowed to
 * write. Locked by `promo-presets.test.ts` — adding a key here without
 * updating the lock will fail CI, which is the point.
 */
export const PRESET_CONTENT_KEYS = [
  'eyebrow',
  'eyebrowIcon',
  'headline',
  'body',
  'ctaAcceptLabel',
  'ctaDeclineLabel',
  'disclaimer',
  'valueAnchor',
  'offerCode',
] as const satisfies ReadonlyArray<keyof PromoPresetContent>;

/**
 * Merges a preset's content into an existing form snapshot. Preserves every
 * field the preset doesn't own (enabled, appearance, trigger, showOn,
 * audience, schedule, accent, image, etc.).
 *
 * Pure function — exported for the apply path AND for the test lock.
 */
export function applyPresetContent(
  current: PromotionalPopupSettings,
  preset: PromoPreset,
): PromotionalPopupSettings {
  return { ...current, ...preset.content };
}
