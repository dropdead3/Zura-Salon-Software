## Goal

Let an organization configure a **promotional pop-up** that displays on their public website (and optionally booking surface). Visitors can **Accept** (which routes them into booking with the offer attached) or **Decline** (which dismisses and remembers the choice). All copy, schedule, targeting, and disclaimer are operator-controlled.

## Architecture overview

```text
                ┌──────────────────────────────┐
                │ Website Editor → "Promotions" │
Org Admin ───►  │  - title / body / CTA copy   │
                │  - offer code + service tag  │
                │  - schedule, frequency cap   │
                │  - disclaimer text           │
                └─────────────┬────────────────┘
                              │ writes
                              ▼
        site_settings(id='promotional_popup', org_id)
                              │ reads (anon)
                              ▼
   ┌────────────────────────────────────────────────────┐
   │ Public site (DynamicPage / BookingSurface)          │
   │   <PromotionalPopup />                              │
   │     ├ Accept → /book?promo=<code>  + log "accept"   │
   │     └ Decline → localStorage dismiss + log "decline"│
   └────────────────────────────────────────────────────┘
                              │
                              ▼
              promo_offer_responses (audit table)
```

Single source of truth: a new `site_settings` row keyed `promotional_popup` per org. Audit trail: a new `promo_offer_responses` table for accept/decline events (anonymous-safe).

## Data model

**`site_settings` row** — id `promotional_popup`, scoped by `organization_id`. JSONB shape:

```ts
{
  enabled: boolean,
  // Content
  headline: string,                     // "Free Haircut with Any Color Service"
  body: string,                         // longer pitch
  ctaAcceptLabel: string,               // "Claim Offer"
  ctaDeclineLabel: string,              // "No thanks"
  disclaimer?: string,                  // "New clients only. Cannot combine..."
  // Offer
  offerCode: string,                    // "FREECUT" — passed to booking
  linkedServiceIds?: string[],          // optional: services that satisfy the offer
  // Behavior
  appearance: 'modal' | 'banner' | 'corner-card',
  trigger: 'immediate' | 'delay' | 'exit-intent' | 'scroll',
  triggerValueMs?: number,              // for delay/scroll
  // Targeting
  showOn: ('home' | 'services' | 'booking' | 'all-public')[],
  audience: 'all' | 'new-visitors-only',
  // Schedule
  startsAt?: string,                    // ISO; null = immediate
  endsAt?: string,                      // ISO; null = no end
  // Frequency cap
  frequency: 'once' | 'once-per-session' | 'daily' | 'always',
  // Style
  imageUrl?: string,
  accentColor?: string,                 // falls back to org theme primary
}
```

Drafts use the existing `draft_value` column so the editor preview shows pending edits before publish (matches the rest of website-editor).

**New table — `promo_offer_responses`** (audit + analytics):

```text
id              uuid PK
organization_id uuid not null  → organizations(id) cascade
offer_code      text not null
response        text not null  CHECK (response IN ('accepted','declined'))
visitor_id      text           -- anon device fingerprint, not auth.uid
session_id      text
page_path       text
user_agent      text
created_at      timestamptz default now()
```

RLS:
- Anon `INSERT` allowed *only* when `organization_id` is in active orgs and `offer_code` matches the currently-enabled popup for that org (enforced via a `SECURITY DEFINER` `record_promo_response(org_id, code, response, ...)` RPC — never raw insert).
- `SELECT` restricted to `is_org_member(auth.uid(), organization_id)`.

Strict tenant isolation; no `USING (true)`.

## UI surfaces

### 1. Operator config — Website Editor → new "Promotions" tab

New file: `src/components/dashboard/website-editor/PromotionalPopupEditor.tsx`

Sections (all wrapped in `PremiumFloatingPanel` per Drawer Canon):
1. **Enable toggle** + live preview thumbnail
2. **Content** — headline, body, disclaimer, image upload
3. **Call to action** — accept label, decline label, offer code, linked services (multi-select from existing services hook)
4. **Behavior** — appearance (modal/banner/corner), trigger, frequency cap
5. **Schedule** — date range pickers, audience toggle
6. **Targeting** — checkbox list of pages where it should appear
7. **Preview** — renders the actual `<PromotionalPopup />` against the draft config so the operator sees exactly what visitors will see

Add nav entry in `WebsiteEditorSidebar.tsx` under existing section list ("Promotions" with `Megaphone` icon from lucide).

### 2. Public component

New file: `src/components/public/PromotionalPopup.tsx`

Responsibilities:
- Reads `promotional_popup` from `useSiteSettings('promotional_popup')` (anon-safe; same hook pattern used for other public site settings).
- Validates schedule window client-side; respects frequency cap via `localStorage` key `zura:promo:<orgId>:<offerCode>` storing `{ lastShownAt, response }`.
- Renders the chosen variant (modal/banner/corner-card). Modal uses existing dialog primitives; banner/corner are lightweight custom components.
- **Accept** → calls `record_promo_response` RPC with `response='accepted'`, then navigates to `/book?promo=<offerCode>` (or to org-specific booking surface URL, resolved via existing routing helper).
- **Decline** → calls RPC with `response='declined'` and sets dismissal in localStorage.
- Respects `prefers-reduced-motion` for entrance animation.
- Accessible: focus trap when modal, `aria-live` announce, ESC closes (counts as decline-soft, not logged unless user clicks button).

Mounted globally in `DynamicPage.tsx` and `BookingSurface.tsx` (gated by `showOn` config).

### 3. Booking integration

`PublicBooking.tsx` reads `?promo=<code>` query param:
- Validates code against active popup config.
- Pre-fills/locks the linked service in the booking flow if `linkedServiceIds` is set.
- Displays a banner: "Offer applied: {headline}".
- The actual discount logic is **out of scope for this iteration** — the offer code is captured on the appointment record (new column `appointments.promo_offer_code`) so payroll / checkout can honor it later. Operator is told this in the editor: "Code is recorded on the appointment. Configure discount mechanics in your service pricing rules."

## Files to create / edit

**New**
- `src/components/dashboard/website-editor/PromotionalPopupEditor.tsx`
- `src/components/public/PromotionalPopup.tsx`
- `src/hooks/usePromotionalPopup.ts` (read draft + published, anon-safe)
- Migration: `promo_offer_responses` table + RLS + `record_promo_response` RPC + `appointments.promo_offer_code` column

**Edit**
- `src/components/dashboard/website-editor/WebsiteEditorSidebar.tsx` — add "Promotions" nav item
- `src/components/dashboard/website-editor/WebsiteEditorShell.tsx` — route to new editor when selected
- `src/pages/DynamicPage.tsx`, `src/pages/BookingSurface.tsx`, `src/pages/PublicBooking.tsx` — mount `<PromotionalPopup />` and read `?promo=` param

## Doctrine compliance

- **Tenant isolation**: every read/write scoped by `organization_id`; RPC validates org match before insert.
- **Site settings persistence**: new editor uses the read-then-update/insert pattern via existing `useUpdateSiteSettings` helper.
- **Typography**: `font-display` for headline (uppercase), `font-sans` for body. No `font-bold`/`font-semibold`.
- **Drawer Canon**: editor uses `PremiumFloatingPanel`; public popup is a standalone modal (not a dashboard drawer, so Sheet rules don't apply).
- **Privacy**: no PII in `promo_offer_responses`; visitor_id is hashed device fingerprint.
- **Phorest write-back**: not touched; offer code lives on Zura `appointments` only.
- **Autonomy**: no AI auto-generation of offers; operator authors all copy.

## Out of scope (next iteration)

- Discount calculation in checkout (this just captures the code).
- A/B testing variants.
- Email/SMS pop-up follow-up.
- Per-stylist or per-location offer overrides.
