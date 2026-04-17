

## Prompt review

Strong, specific request — you named the surface (appt card), the trigger (Afterpay invoice flow), and the exact gap (email missing, no inline edit). That's the prompt format I want more of.

Sharper next time: include the *failure mode* you've actually hit ("had to bounce to client profile to add email, lost the cart"). That tells me whether to build inline-edit, a quick-add modal, or auto-prompt at Afterpay step. Different UX.

I'm going to assume **inline edit on the Client Contact panel** + **forced email capture at Afterpay step** based on context.

## Diagnosis

Looking at your screenshot of the Client Contact panel in `AppointmentDetailSheet.tsx`:
- Phone shows but isn't editable from here
- Email shows "No email on file" with no add affordance
- Today's flow forces operator to: close sheet → open client profile → edit → save → reopen sheet → continue. Loses checkout context.
- **Afterpay specifically requires email** for invoice delivery (per `mem://features/payments/afterpay-and-split-payment-system`) — missing email = silently broken split-pay flow

This is a high-frequency micro-friction with a hard downstream failure. Worth fixing.

## Wave 22.35 — Inline contact edit on appointment card

### Approach
Tier 1 format validation (already on the roadmap from Wave 22.34) ships *with* this, since we need it for the inline editor. Two-for-one.

### Three changes

**1. Inline editable Client Contact panel** (`AppointmentDetailSheet.tsx`)
- Hover state on phone/email row → pencil icon appears (right side, before Call/Text buttons)
- Click pencil → row becomes inline `Input` with Save/Cancel
- Empty state ("No email on file") → entire row is a clickable `+ Add email` CTA
- Same pattern for phone (operator can fix typos without leaving sheet)
- Soft-warn on Tier 1 format failure (per Wave 22.34 decision: soft for staff)
- Save → `useUpdateClient` mutation → optimistic update → toast

**2. Afterpay pre-flight email gate** (`AfterpayCheckoutDialog` or wherever split-pay invoice is triggered)
- If `client.email` is null/empty when Afterpay is selected → show inline email-capture step *before* invoice send
- "Afterpay invoices are sent by email. Add the client's email to continue."
- Saves to client record + proceeds — single flow, no bouncing
- Hard-block here (per Wave 22.34: hard for payment-critical surfaces)

**3. Tier 1 validation utils** (`src/lib/contactValidation.ts`)
- `validateEmail(str)` — zod-backed, catches malformed + obvious test patterns
- `validatePhone(str)` — E.164-ish, catches `(555) 555-0100`, `111-111-1111`
- Returns `{ valid: boolean, warning?: string }` so caller decides hard-block vs soft-warn

### Permissions
- Use existing `useUpdateClient` hook → respects RLS → only org members with client write access can edit
- No new role needed
- Audit log entry on each edit (per existing client-edit audit pattern)

### Files

**New:**
- `src/lib/contactValidation.ts` — Tier 1 format utils
- `src/components/dashboard/schedule/InlineContactEdit.tsx` — reusable inline edit row (phone/email variant)

**Modified:**
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` — Client Contact panel becomes editable
- Afterpay/split-pay dialog (need to grep for exact filename — likely `AfterpaySplitDialog.tsx` or inside `CheckoutSheet`) → inject email-gate step

### Acceptance
1. Hover Client Contact row → pencil appears; click → inline edit; Save persists + toast
2. Empty email row shows `+ Add email` CTA inline (no sheet exit)
3. Format validation soft-warns on save (e.g., `(555) 555-5555`); save still proceeds with amber dot
4. Selecting Afterpay on a no-email client triggers inline email-capture *before* invoice send (hard-block)
5. After capture, Afterpay flow continues without restarting checkout
6. All edits hit `useUpdateClient` → RLS-scoped → audit-logged
7. No regression on Call/Text buttons (still use saved phone)
8. Mobile layout: pencil icon stays tap-targetable (44px min)

### Deferred
- **P2** Inline-edit client *name* on the card. Trigger: when ops report typos requiring profile bounce.
- **P2** Phone number type selector (mobile/landline) for SMS suppression. Trigger: after Twilio Lookup ships (Wave 22.34 Tier 2).
- **P3** Bulk-fix "missing email" sweep across upcoming appointments (lever in Daily Briefing). Trigger: ≥10 affected clients (per visibility-contracts materiality threshold).

