

## Prompt review

Sharp bug report — names the surface (client appt popover), the trigger (Call/Text buttons), the symptom (browser system prompt → FaceTime/Messages dialog), and the desired fix (Zura-native popups). Sharper next time: tell me what you want the Zura popup to *do* — just confirm before opening the OS app, or actually send the SMS in-app via Twilio (no OS handoff)? I'll propose both options.

## Diagnosis

In `AppointmentDetailSheet.tsx` (lines 1531–1557), the Call and Text buttons use raw `<a href="tel:...">` and `<a href="sms:...">` anchors. macOS intercepts these and shows the "Open FaceTime?" / "Open Messages?" system prompt (per the screenshots) — there's no way to suppress that browser-level dialog when using the native protocol handlers.

Two clean ways to replace it, both fully in-Zura:

**Option A — Confirmation popup (lightweight)**
A Zura-styled modal: "Call Eric Day at (555) 123-4567?" with Copy Number / Call buttons. The Call button still uses `tel:` (so it works on iPhone/iPad and on Mac if user keeps FaceTime), but on desktop the *primary* action is "Copy number" — eliminating the jarring system prompt for staff who don't want to call from their Mac.

**Option B — Native SMS via Twilio (heavier, higher value)**
Reuses the existing `sendSms` infrastructure (Twilio per-org credentials in `organization_secrets`) plus the SMS templates system. Click "Text" → opens a Zura compose modal with quick-reply templates ("Running 5 min late?", "Confirming your appt", custom message) → sends via Twilio from the salon's number → logged to client comms history. No OS handoff, ever. Call stays as Option A.

Recommended: **A for Call, B for Text** — that matches operator behavior (staff rarely call from a Mac, but they text constantly and want it logged + branded from the salon's number, not their personal phone).

## Plan — Wave 22.5: Zura-native Call/Text popups

### 1. New `ContactActionDialog` component

`src/components/dashboard/schedule/ContactActionDialog.tsx`

- Mode prop: `'call' | 'text'`
- Props: `clientName`, `phone`, `clientId?`, `appointmentId?`, `organizationId`, `open`, `onOpenChange`
- Zura-styled `Dialog` (rounded-xl, glass aesthetic, `font-display` heading)

**Call mode:**
- Header: "Call {clientName}"
- Big phone number display (`text-2xl font-display`)
- Two actions: `[Copy Number]` (primary on desktop) and `[Open in Phone App]` (secondary, uses `tel:` — user knows what's coming)
- Toast confirmation on copy

**Text mode:**
- Header: "Text {clientName}"
- Recipient row showing name + phone
- Quick-template chips (pulled from `sms_templates` table for the org, or hardcoded fallback set: "Running late?", "Confirm your appt", "We have an opening")
- Textarea for custom message (160-char counter)
- `[Send via Salon Number]` primary button → calls a new edge function
- `[Open in Messages App]` secondary fallback (uses `sms:` for users who prefer)
- Empty state if Twilio not configured: "Connect Twilio in Settings → Communications to text from your salon's number" + secondary `sms:` fallback

### 2. New edge function: `send-client-sms`

`supabase/functions/send-client-sms/index.ts`

- Auth: requires JWT, validates user is org member
- Body: `{ organization_id, client_id?, appointment_id?, to_phone, message, template_key? }`
- Reuses `_shared/sms-sender.ts` → `sendSms()`
- Logs to a new `client_communications` table (or extends an existing one) with: org_id, client_id, appointment_id, channel='sms', direction='outbound', body, sent_by_user_id, twilio_sid
- Returns `{ success, sid?, error? }`

### 3. Wire into `AppointmentDetailSheet.tsx`

Replace lines 1531–1557:
- Remove `<a href="tel:">` and `<a href="sms:">` anchors
- Add `useState` for `callDialogOpen` and `textDialogOpen`
- Buttons become regular `onClick` handlers that open the respective dialog
- Render `<ContactActionDialog>` x2 at the bottom of the sheet

### 4. Reuse opportunity

The same `ContactActionDialog` plugs into:
- `ClientDetailSheet.tsx` (lines 586–606)
- `MobileAgendaCard.tsx` (line 207)
- `WaitlistTable.tsx` (line 135)
- `ClientDirectory.tsx` (line 1248)
- `AppointmentCardContent.tsx` (line 422)

I'll wire it into `AppointmentDetailSheet` first (the surface in the screenshots), then optionally roll out to the others in a follow-up wave so we don't bloat this change.

### Acceptance checks

1. Click "Call" on appt popover → Zura dialog appears (no FaceTime prompt)
2. Dialog shows client name + formatted phone number prominently
3. "Copy Number" → toast confirms, number is in clipboard
4. "Open in Phone App" → triggers `tel:` (user accepts that one knowingly)
5. Click "Text" → Zura compose dialog opens
6. Quick-template chip click populates textarea
7. "Send via Salon Number" → SMS sent via Twilio, toast confirms, dialog closes
8. If Twilio not configured → message + secondary `sms:` fallback shown
9. Dialog respects dark mode and design tokens (font-display heading, rounded-xl, glass card)
10. No `tel:` or `sms:` href fires automatically on button click — only via secondary explicit action

### Files

**New:**
- `src/components/dashboard/schedule/ContactActionDialog.tsx` — Zura-styled call/text modal
- `supabase/functions/send-client-sms/index.ts` — outbound SMS edge function
- `supabase/config.toml` — register new function (verify_jwt = true)

**Modified:**
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` — swap anchors for dialog triggers (lines ~1531–1557)

**Database (migration):**
- `client_communications` table (org_id, client_id, appointment_id, channel, direction, body, sent_by_user_id, twilio_sid, created_at) with RLS scoped to `is_org_member` for read and `is_org_admin` for write

### Open question

Want me to also include the broader rollout (ClientDetailSheet, MobileAgendaCard, WaitlistTable, ClientDirectory) in this wave, or keep it scoped to `AppointmentDetailSheet` first and roll out after you verify the UX feels right?

### Deferred

- **P2** Inbound SMS handling (Twilio webhook → notification → reply thread in Zura) — trigger: when staff request two-way conversations
- **P2** Client-side communication history tab on `ClientDetailSheet` (shows all past texts/calls logged) — trigger: after `client_communications` table accumulates data
- **P2** Bulk text composer (waitlist offers, "we had a cancellation") — trigger: when staff request multi-recipient outreach

