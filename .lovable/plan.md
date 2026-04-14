

# Enhance Receipt Configuration — Logo, Socials, Policies & Review Prompt

## Problem
1. **Logo**: The receipt preview uses `logo_dark_url` (dark logo) which is for dark backgrounds. Receipts are white — it should use `logo_light_url` first (which is the dark-colored logo for light backgrounds), falling back to `logo_dark_url`.
2. **Missing sections**: No way to show an icon logo at the bottom, social links, website, redo/refund policies, satisfaction guidance, or review prompts on receipts.

## Data Sources Already Available
- **Business settings** (`useBusinessSettings`): `logo_light_url`, `icon_light_url`, `icon_dark_url`, `website`
- **Social links** (`useWebsiteSocialLinksSettings`): instagram, facebook, tiktok, etc.
- **Review URLs** (`useReviewThresholdSettings`): `googleReviewUrl`, `yelpReviewUrl`, `facebookReviewUrl`
- **Redo policy** (`useRedoPolicySettings`): `redo_window_days`, `redo_pricing_policy`

## Changes

### 1. `src/hooks/useReceiptConfig.ts` — Extend the config interface

Add new fields to `ReceiptConfig` and `DEFAULT_RECEIPT_CONFIG`:

```ts
show_footer_icon: boolean;        // default false
show_socials: boolean;            // default true
show_website: boolean;            // default true
show_redo_policy: boolean;        // default false
redo_policy_text: string;         // default '' (auto-generated from redo settings if empty)
show_refund_policy: boolean;      // default false
refund_policy_text: string;       // default 'All sales are final. Contact us within 48 hours with any concerns.'
show_satisfaction_note: boolean;  // default true
satisfaction_text: string;        // default 'Not satisfied? Contact us and we'll make it right.'
show_review_prompt: boolean;      // default true
review_prompt_text: string;       // default 'Loved your visit? Leave us a review!'
```

### 2. `src/components/dashboard/settings/terminal/ZuraPayReceiptsTab.tsx`

**Fix logo resolution (line 115)**: Change from `logo_dark_url || logo_light_url` to `logo_light_url || logo_dark_url` — light URL is the dark-colored logo meant for white backgrounds.

**Add new hooks**: Import `useWebsiteSocialLinksSettings` and `useReviewThresholdSettings`.

**Settings panel** — Add new toggle sections after existing fields (before Accent Color):

- **Show Footer Icon** toggle + description "Display a small icon logo at the bottom of the receipt"
- **Show Website** toggle
- **Show Social Links** toggle
- **Satisfaction Note** toggle + editable text input
- **Redo Policy** toggle + text area (placeholder auto-populates from redo settings: "Redos accepted within X days")
- **Refund Policy** toggle + text area
- **Review Prompt** toggle + text input

**Preview component** — Add new sections after the existing footer:

- Satisfaction note (centered, small gray text)
- Redo/refund policy lines (small gray text)
- Review prompt with linked platform names (Google, Yelp, etc.) pulled from review threshold settings
- Social handles (Instagram, Facebook, TikTok icons as text)
- Website URL
- Footer icon (small, centered, using `icon_light_url` for white background)

### 3. `src/components/dashboard/transactions/ReceiptPrintView.tsx`

**Fix logo resolution**: The caller should pass `logo_light_url` first (for white bg). This is already handled by the caller — just needs the `ZuraPayReceiptsTab` fix.

**Extend `ReceiptBusinessInfo`**: Add `iconUrl`, `website`, `socials`, `reviewUrls` fields.

**Add new HTML sections** in the footer area matching the new config fields — satisfaction note, policies, review links, socials, website, footer icon.

### 4. Structural summary

No database changes needed — all new fields are stored inside the existing `receipt_config` JSON blob in `site_settings`. The `ReceiptConfig` interface extends `Record<string, unknown>` so new keys are compatible.

The settings panel groups logically:
1. **Header section** (existing): Logo, address, phone
2. **Transaction section** (existing): Stylist, payment method
3. **Footer content** (new): Satisfaction, policies, review prompt
4. **Branding** (existing + new): Custom message, footer text, accent color, footer icon, website, socials

