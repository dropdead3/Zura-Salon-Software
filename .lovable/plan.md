

## Prompt review

Smart call — auto email/phone match is the right move for this use case because inquiries are *self-identified* (the client is voluntarily providing their contact info to the salon), so the matching signal is high-confidence by design. This isn't AI inferring identity from ambiguous signals; it's deterministic key-matching on data the client themselves supplied. That keeps it inside the doctrine ("AI is prohibited from determining business eligibility" — but deterministic key matching is *not* AI inference).

Tighter framing for next time: when choosing between manual vs auto identity bridges, the right test is "did the user explicitly assert this identity?" — for inquiries, yes (they typed the email/phone). For something like POS-to-Zura staff mapping, no (admin must confirm). You correctly pattern-matched to the high-trust case here.

One refinement I'm proposing on top of your ask: also run the match **at inquiry submission time** (not just at appointment booking time), so that if the client already exists in Phorest, the inspiration photos link immediately and the Lead Inbox conversion screen shows "Likely matches existing client: Jane Smith." Lead Inbox stays the override surface for ambiguous/false-positive cases.

## Plan (revised — auto-match identity bridge)

### 1. Capture layer (unchanged from prior plan)

- New storage bucket `inquiry-inspiration` (private; signed URLs for staff read).
- New table `inquiry_inspiration_photos` (`id`, `organization_id`, `inquiry_id`, `client_id` nullable text, `file_path`, `file_name`, `uploaded_at`).
- Multi-file upload control in `ConsultationFormDialog.tsx` and `Booking.tsx` (max 5 files × 5 MB, image MIME only, advisory copy).
- `leadCapture.ts` extended to upload files post-insert and persist photo rows.

### 2. Auto-match identity bridge (new — replaces manual-only)

**Server-side resolver** — new edge function `resolve-inquiry-identity` (or inline RPC `resolve_inquiry_to_client`) that runs on inquiry insert via a Postgres trigger:

**Match priority (deterministic, ranked):**
1. **Exact email match** (case-insensitive, normalized) against `phorest_clients.email` scoped to `organization_id` → highest confidence
2. **Exact phone match** (normalized to E.164 / digits-only) against `phorest_clients.mobile` → high confidence
3. **Both email + phone match the same client** → confirmed (boost confidence)
4. **Email matches one client, phone matches a different client** → ambiguous → no auto-link, flag for Lead Inbox review
5. **No match** → no link; inquiry remains unmatched

**On match:**
- Set `salon_inquiries.phorest_client_id` = matched client id
- Set `salon_inquiries.match_method` = `'auto_email'` | `'auto_phone'` | `'auto_both'` (new column for audit)
- Set `salon_inquiries.match_confidence` = `'high'` | `'medium'` | `'ambiguous'` (new column)
- Backfill `inquiry_inspiration_photos.client_id` for any photos already uploaded with this inquiry
- Auto-set `salon_inquiries.converted_at` only when confidence = `high` AND match is unambiguous; otherwise leave for Lead Inbox confirmation

**Why server-side (trigger/edge function), not client-side:** anon role cannot read `phorest_clients` (RLS-protected), so matching must run in a SECURITY DEFINER function or service-role edge function.

### 3. Lead Inbox enhancement

- `useLeadInbox.ts` displays match status badges: `Auto-matched (high)` / `Auto-matched (phone only)` / `Ambiguous — review` / `Unmatched`
- Staff can override an auto-match (re-link to a different client) — calls existing conversion mutation, which also re-backfills `inquiry_inspiration_photos.client_id`.
- Override action logs to `audit_log` for traceability.

### 4. Surface layer (unchanged from prior plan)

- New hook `useClientInspirationPhotos(clientId)` queries `inquiry_inspiration_photos` joined to `salon_inquiries` filtered by `client_id`.
- New `InspirationPhotosSection.tsx` (read-only grid + lightbox, dated thumbnails).
- Renders in `AppointmentDetailSheet.tsx` Photos tab above the existing `TransformationTimeline`. Hidden when no photos exist.

### 5. Non-goals (this round)

- No fuzzy/Levenshtein name matching (false-positive risk too high — keeps doctrine compliance).
- No retroactive backfill of past inquiries.
- No edit/delete of inspiration photos from the appointment surface (Lead Inbox is the management surface).
- No promotion of inspiration photos → portfolio/transformation library.

## Acceptance checks

1. Inquiry submission with email matching an existing Phorest client → auto-linked with `match_method='auto_email'`, `match_confidence='high'`. Inspiration photos link immediately.
2. Inquiry with phone matching an existing client (no email match) → auto-linked with `match_method='auto_phone'`.
3. Inquiry where email and phone match *different* clients → no auto-link, flagged `ambiguous` in Lead Inbox.
4. Inquiry with no email/phone matches → unmatched, available in Lead Inbox for manual conversion.
5. Lead Inbox shows match-confidence badges and supports override; override re-backfills photo `client_id`.
6. Public inquiry forms accept up to 5 photos × 5 MB, image MIME only, with calm advisory copy.
7. Appointment Photos tab renders "Inspiration from Booking Inquiry" section above transformations when the linked client has any inspiration photos. Each thumbnail shows submission date.
8. Section hidden entirely when no inspiration photos exist (no empty-state noise).
9. RLS: anon can insert inspiration photo rows tied to their just-created inquiry; only org members can read.
10. Storage signed URLs expire at 24h and refresh on read.
11. Audit log captures auto-match decisions and any manual overrides.
12. No regression to TransformationTimeline behavior.

## Files to modify / create

**Database (migration):**
- New table `inquiry_inspiration_photos` + RLS
- New columns on `salon_inquiries`: `match_method`, `match_confidence`
- New SECURITY DEFINER function `resolve_inquiry_identity(inquiry_id uuid)`
- New trigger on `salon_inquiries` insert → calls resolver
- New storage bucket `inquiry-inspiration` + storage RLS

**Capture:**
- `src/lib/leadCapture.ts` — accept `inspirationFiles?: File[]`, upload after insert
- `src/components/ConsultationFormDialog.tsx` — multi-file upload control
- `src/pages/Booking.tsx` — multi-file upload control

**Bridge:**
- `src/hooks/useLeadInbox.ts` — surface match status; override re-backfills photo `client_id`
- `src/components/dashboard/leads/LeadInboxRow.tsx` (or equivalent) — match-confidence badge

**Surface:**
- `src/hooks/useClientInspirationPhotos.ts` (new)
- `src/components/dashboard/clients/InspirationPhotosSection.tsx` (new — read-only grid + lightbox)
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` — render section in Photos tab

