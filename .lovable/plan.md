## Goal

Wire the existing Reputation Engine (`client_feedback_responses`) into the Website Editor's Reviews section so operators can curate consent-approved 5-star reviews into their salon website — without manual copy/paste, while preserving the original review record, consent state, and full editorial control.

## What's already built (reuse, don't duplicate)

- **Source-of-truth table**: `client_feedback_responses` (rating 1-5, comments, NPS, client/staff/appointment FKs, `is_public`, `passed_review_gate`).
- **Display table**: `website_testimonials` (org-scoped, surface = `'general' | 'extensions'`, RLS correct).
- **Editor surface**: `TestimonialsEditor.tsx` + `ReviewsManager.tsx` (drag-orderable, preview-bridged, save-telemetry wired).
- **Live render**: `TestimonialSection.tsx` (carousel) + `ExtensionReviewsSection.tsx`.
- **Threshold settings**: `useReviewThreshold.ts` (already defines minimum rating, NPS, public follow-up).

## Gaps to close

1. No bridge from `client_feedback_responses` → `website_testimonials`.
2. No client-facing consent capture for website display.
3. No display-name preference (first-only / first+initial / anonymous).
4. No edited-for-display copy separate from the original.
5. No featured/pinned/hidden states beyond binary `enabled`.
6. No layout selector (carousel / grid / stacked / hero).
7. No service/stylist/location filters in the curation UI.
8. No source selector (manual / Zura reviews / mixed) on the section.

## Phase 1 — Schema (migration)

**Extend `client_feedback_responses`** with consent + display preferences (additive, all nullable, defaults preserve current behavior):
- `display_consent boolean default false` — explicit website-display consent
- `display_consent_at timestamptz`
- `display_name_preference text` — `'first_only' | 'first_initial' | 'anonymous' | null`
- `display_status text default 'new'` — `'new' | 'eligible' | 'approved' | 'featured' | 'hidden' | 'unpublished' | 'needs_consent' | 'archived'`
- `display_status_at timestamptz`, `display_status_by uuid`
- Validation trigger (not CHECK) enforces enum values.

**Extend `website_testimonials`** to link curated reviews back to source:
- `source_response_id uuid references client_feedback_responses(id) on delete set null` (unique partial index where not null — one website row per source review)
- `display_edited boolean default false` — set true when operator edits body
- `original_body text` — snapshot of source comment at curation time (immutable copy)
- `is_featured boolean default false`
- `feature_scopes text[] default '{}'` — `'homepage' | 'service_pages' | 'stylist_pages'`
- `service_id uuid`, `stylist_user_id uuid`, `location_id uuid` — denormalized filter facets (nullable; copied at curation)
- `show_stylist boolean default true`, `show_service boolean default true`, `show_date boolean default true`, `show_rating boolean default true`
- `display_name_override text` — operator-overridable presentation name

**Extend `site_settings.section_testimonials`** value blob (no schema change; JSONB):
- `review_source: 'manual' | 'zura' | 'mixed'` (default `'manual'` — preserves current behavior)
- `layout: 'carousel' | 'grid' | 'stacked' | 'hero'`
- `featured_review_id` (optional hero pick)

RLS: existing org-scoped policies on both tables already cover the new columns.

## Phase 2 — Eligibility view + hooks

**Postgres view `eligible_website_reviews`** (security_invoker so RLS applies):
```
client_feedback_responses
  WHERE overall_rating = 5
    AND comments IS NOT NULL AND length(trim(comments)) > 0
    AND appointment_id IS NOT NULL
    AND display_status NOT IN ('archived','unpublished')
```
Joined to `phorest_clients` (name), `appointments` (service, staff, location), `website_testimonials` (curated state via `source_response_id`).

**New hooks** (`src/hooks/useEligibleReviews.ts`):
- `useEligibleReviews(filters)` — paginated, with `staleTime: 30_000` per high-concurrency canon.
- `useCurateReview()` — creates a `website_testimonials` row from a `client_feedback_responses` row, snapshots `original_body`, defaults `enabled=true`, `display_status='approved'`. Validates `display_consent=true` (or operator override flag with audit log).
- `useUnpublishReview(testimonialId)` — sets `enabled=false` + source `display_status='unpublished'`.
- `useFeatureReview()` — toggles `is_featured` + `feature_scopes`.

## Phase 3 — Review Library UI

New file: `src/components/dashboard/website-editor/ZuraReviewLibrary.tsx`
- Drawer mounted from `TestimonialsEditor` when `review_source !== 'manual'`.
- Three tabs: **Eligible**, **Curated**, **Hidden**.
- Filters: text search, service category, stylist, location, date range.
- Row shows: stars, body excerpt (3-line clamp + "read more"), client display name (per current preference), service, stylist, location, appointment date, consent badge, status badge.
- Actions per row: **Add to Website** (curate) · **Edit display** · **Feature** · **Hide** · **Unpublish**.
- "Edit display" opens a side-by-side: original (read-only) vs. editable display copy. Saving sets `display_edited=true` and shows an "edited for display" indicator. Original remains untouched on `client_feedback_responses`.
- Compliance reminder banner if `display_consent=false` — operator must check "I have written/recorded consent from this client" to proceed (writes audit log row).
- Empty state: "No 5-star reviews yet — request feedback from recent clients" with CTA to feedback request flow.

## Phase 4 — Section editor wiring

`TestimonialsEditor.tsx`:
- Add **Review Source** segmented control (manual / Zura / mixed) above the existing `ReviewsManager`.
- Add **Layout** select (carousel / grid / stacked / hero).
- When source = Zura/mixed: render `ZuraReviewLibrary` button + curated count chip; `ReviewsManager` filters to manual rows (no `source_response_id`).
- Bulk pickers: "Select all approved", "Select featured only", "Select by service / stylist / location".

## Phase 5 — Live render

`TestimonialSection.tsx`:
- Branch on `layout` config (carousel exists; add grid, stacked, hero variants — pure subcomponents per Preview-Live Parity Pattern).
- Apply per-row display flags (`show_stylist`, `show_service`, `show_date`, `show_rating`).
- Resolve display name: prefer `display_name_override` → else compute from source `display_name_preference` + client name → fallback `'Anonymous'`.
- Featured review hero variant uses `featured_review_id` when set.

## Phase 6 — Consent capture (client side)

Existing public feedback form (`src/pages/ClientFeedback.tsx`):
- Add **display consent checkbox** + **display name preference radio** (first only / first + initial / anonymous).
- On submit, write `display_consent`, `display_consent_at`, `display_name_preference` to the response row.
- If `overall_rating = 5 && comments && display_consent`, set `display_status='eligible'`; else `'new'` or `'needs_consent'`.

## Phase 7 — Tests

- `eligibleWebsiteReviews.test.ts` — view returns only 5-star + comment + completed appointment.
- `useCurateReview.test.tsx` — blocks without consent unless override flag + audit row written.
- `ZuraReviewLibrary.filters.test.tsx` — filter composition.
- `TestimonialSection.layouts.test.tsx` — each layout renders with feature flags.
- `displayNameResolution.test.ts` — preference + override fallback chain.

## Out of scope (explicitly)

- Posting reviews to Google/Yelp/Apple/Facebook (separate public-review flow already exists in `useReviewThreshold`).
- AI-generated review text or summaries (violates AI autonomy doctrine for editorial content).
- Auto-publishing without operator approval (violates consent gate).
- Editing the original `client_feedback_responses.comments` value.

## Doctrine compliance

- **Tenant isolation**: all new columns/queries scoped via existing `organization_id` RLS.
- **Original review protection**: enforced at hook layer; UI surfaces "edited for display" indicator.
- **Silence is valid output**: empty Zura library renders consent/request prompt, not fake placeholder reviews.
- **Preview-Live Parity Pattern**: layout variants extracted as pure subcomponents shared by editor preview and live render.
- **Container-aware**: layouts respond via existing spatial primitives, not viewport breakpoints.
- **Typography canon**: Termina for headers, Aeonik for body, no `font-bold`.
- **No autonomous publishing**: every state transition gated on operator action.

## Files touched (estimate)

**New** (~6):
- `supabase/migrations/<ts>_website_review_publishing.sql`
- `src/hooks/useEligibleReviews.ts`
- `src/components/dashboard/website-editor/ZuraReviewLibrary.tsx`
- `src/components/home/testimonials/TestimonialLayouts.tsx` (shared layouts)
- `src/lib/reviewDisplayName.ts` (name resolution)
- Tests (5)

**Edited** (~5):
- `src/components/dashboard/website-editor/TestimonialsEditor.tsx`
- `src/components/dashboard/website-editor/ReviewsManager.tsx` (filter to manual rows)
- `src/components/home/TestimonialSection.tsx`
- `src/hooks/useTestimonials.ts` (curation helpers)
- `src/pages/ClientFeedback.tsx` (consent capture)

## Prompt feedback (per project knowledge)

**What worked well**: You named the source system, the destination, the consent boundary, the doctrine line ("Zura is not reposting to third parties"), and gave a concrete state machine. That made scope unambiguous and let me skip clarifying questions.

**Sharper next time**: 
1. Lead with the **non-goals** (you got there at "Important:" — promote that to the top so the agent can't drift into a Google Review reposter).
2. Specify which **persona** owns this surface (Salon Owner vs. Manager) — affects whether the library appears in the Website Editor only, or also in a standalone Reputation Hub.
3. State whether **historical reviews** (pre-consent-feature) should be backfilled as `'needs_consent'` or left as `'new'` — this is the kind of decision that costs a follow-up loop if unstated.