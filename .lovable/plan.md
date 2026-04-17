

## Prompt review

Good instinct — data quality at the contact-capture point is foundational; bad phones/emails silently break confirmations, marketing, deposits, and review requests. Sharper next time: name the surface ("client contact panel in Appointment Detail Sheet") and the trigger ("at booking creation? on save? passive sweep?"). That tells me whether you want a *blocking validator* (hard gate) vs. *advisory flag* (soft signal). Different architectures.

## Diagnosis — what "verified" can mean

There are three distinct levels. They're often conflated. Pick deliberately:

| Level | What it catches | Cost | UX |
|---|---|---|---|
| **1. Format** | "asdf@asdf", letters in phone, wrong length | Free, instant | Inline red border |
| **2. Deliverability** | Real domain (MX records), real carrier line, disposable-email blocklist | ~$0.005/lookup | Async badge, ~500ms |
| **3. Possession** | Client actually owns the number/email (OTP/click) | Free infra, friction | Adds a step at booking |

Most "fake number" problems live at **Level 2** — receptionist types `(480) 555-0100`, format passes, but it's a non-working line. Level 1 misses it. Level 3 is overkill at front-desk capture (kills throughput).

## Proposed approach — Wave 22.34: Contact Verification Layer

Three-tier system, additive (no breaking changes):

### Tier 1 — Format validation (ship immediately, free)
- Add `validateEmail()` and `validatePhone()` utils (zod-backed)
- Detect: malformed format, obvious test patterns (`555-0100`, `test@test.com`, `noemail@`, repeated digits like `111-111-1111`)
- Wire into: `ClientForm`, `AppointmentDetailSheet` client edit, public booking, lead capture
- UI: inline red border + tooltip "Looks like a placeholder number"

### Tier 2 — Deliverability check (background, async)
- New table `contact_verifications` (client_id, channel, status, checked_at, provider_response)
- Edge function `verify-contact` calls a lookup provider:
  - **Email**: free MX-record check via DNS + disposable-domain blocklist (Kickbox open-source list, no API cost). Optional upgrade: Hunter.io / NeverBounce ($)
  - **Phone**: Twilio Lookup ($0.005/req) — returns `line_type` (mobile/landline/voip), carrier, validity. *VoIP + invalid = likely fake.*
- Run on: client create, client update, nightly sweep of unverified records
- UI: small badge next to phone/email
  - ✓ Verified (green, subtle)
  - ⚠ Unreachable (amber)
  - ✕ Invalid (red)
  - (no badge if unchecked yet — silence is valid)

### Tier 3 — Possession (deferred to public booking only)
- Already partially in place via deposit collection (card = weak proof of identity)
- True OTP only at public booking when no deposit required + first-time client. Not on internal staff capture.

### Where badges surface
- `AppointmentDetailSheet` → Client Contact panel (your screenshot) → next to phone & email lines
- `ClientCard` / clients table → small dot indicator
- Daily Briefing → "12 clients have unreachable contact info" lever (only if material, per visibility-contracts doctrine)

### Operational lever (the Zura-native part)
A new audit query → "X clients with unverified contacts representing $Y in upcoming bookings." Surfaces in Operations Hub. Material threshold: only show if ≥10 clients OR ≥$500 in at-risk bookings.

## Decision points (need your input)

I need 2 answers before building:

1. **Phone provider**: Twilio Lookup ($0.005/req, ~$5/mo for typical org) vs. format-only (free, misses VoIP/disconnected lines)?
2. **Blocking vs. advisory**: When format fails on `ClientForm`, hard-block save or save-with-warning?

## Files (preview — finalized after Q&A)

**New:**
- `supabase/migrations/*` — `contact_verifications` table + RLS
- `supabase/functions/verify-contact/index.ts` — lookup orchestrator
- `src/lib/contactValidation.ts` — Tier 1 utils
- `src/hooks/useContactVerification.ts`
- `src/components/dashboard/clients/ContactVerificationBadge.tsx`
- `src/components/dashboard/clients/UnverifiedContactsLever.tsx` (Ops Hub card)

**Modified:**
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` (badges in Client Contact)
- `src/components/dashboard/clients/ClientForm.tsx` (Tier 1 validation)
- `src/lib/leadCapture.ts` (validate before insert)
- `src/components/dashboard/clients/ClientCard.tsx` (dot indicator)

## Acceptance
1. Saving a client with `(555) 555-5555` shows inline warning (Tier 1)
2. Existing clients get verified in background within 24h (nightly sweep)
3. Appointment Detail Sheet shows ✓/⚠/✕ badge next to phone/email
4. "Call" / "Text" buttons disable on confirmed-invalid numbers with tooltip
5. Ops Hub surfaces aggregate count only when ≥10 clients affected (per visibility-contracts)
6. No regression on existing `PlaceholderBadge` (different concept — that's "no contact at all")

## Deferred
- **P2** OTP verification at public booking for first-time, no-deposit bookings. Trigger: when fake-booking abuse reported.
- **P3** Auto-suppress SMS/email automations to invalid contacts (saves Twilio/SendGrid spend). Trigger: after Tier 2 ships and we have 30 days of data.
- **P3** Re-verify quarterly (numbers churn ~5%/yr). Trigger: after 3 months of accumulated data.

