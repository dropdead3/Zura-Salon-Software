## Goal

Close the trust loop on the team-member archive soft-notify pipeline with four operator-facing controls: pre-flight visibility, pre-flight smoke test, post-flight delivery watch, and admin template editing.

## Status check on the four enhancements

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Per-client preview before commit | Build | New collapsible list in Step 4 |
| 2 | Delivery receipt watch | **Build (scoped)** | See "Reality check" below |
| 3 | Surface SMS template in editor | **Already shipped** | `stylist-reassignment-soft-notify` row inserted by prior migration is automatically picked up by `SmsTemplatesManager` mounted at Settings → Communications. No further work needed beyond a one-line description on the template row so admins know what triggers it. |
| 4 | Smoke test "Send myself a sample" | Build | New edge function + Step 4 button |

## Reality check on Enhancement #2

The codebase's `email_send_log` table is a minimal **send-counter** (`organization_id`, `client_id`, `email_type`, `message_id`, `sent_at`) — it does **not** carry `status`, `error_message`, `bounced`, or `complained` columns. The Lovable email-infrastructure schema referenced in the platform docs is **not** what this project uses; instead, sends go through `sendOrgEmail` (Resend) and writes a single row here on success.

What signal actually exists today:
- **Email**: only "we attempted a send" (row in `email_send_log`) + open/click events in `email_tracking_events`. No bounce, no complaint, no failure.
- **SMS**: `client_communications.status` + `error_message` + `twilio_sid` — real delivery state.

Two honest options for #2:

**Option A — Ship what's true today (recommended):**
- Add `archive_log_id` (nullable uuid) to `email_send_log` and `client_communications`.
- Edge function stamps it on every soft-notify send.
- Profile timeline tile shows: "X emails sent · Y SMS sent · Z SMS failed (with reason)" + open-rate from `email_tracking_events`. Honest about what we can see.

**Option B — Wire real bounce capture (out of scope):**
Requires Resend webhook handler + new `email_delivery_events` table + suppression sync. Significant infrastructure work — propose as a separate wave.

This plan ships Option A.

## Changes

### 1. Per-client preview (Step 4 expandable list)

In `ArchiveWizard.tsx` Step 4, replace the static `"{emailCount} via email · {smsOnlyCount} via SMS"` line with a `<Collapsible>` that expands to show every reassigned client as a row:

- Avatar + name
- Channel badge: `Email`, `SMS`, or `No contact`
- Per-row `Switch` to suppress that client (defaults on)

Wizard state gains `suppressedClientIds: Set<string>`. Passed to the mutation; edge function skips any client in this set.

UI rules: Termina label, Aeonik body, `tokens.card` patterns, `Switch` from `@/components/ui/switch`. No bold weights.

### 2. Smoke test button (Step 4)

New edge function `archive-soft-notify-preview`:
- Inputs: `organizationId`, `archivedStylistName` (preview value), `successorStylistName` (first reassignment destination), `recipientEmail`, `recipientPhone`.
- Resolves caller's identity via JWT, validates membership.
- Sends ONE email via `sendOrgEmail` with `[PREVIEW]` subject prefix and the same branded HTML.
- Sends ONE SMS via `sendSms` with the `stylist-reassignment-soft-notify` template, prefixed `[PREVIEW] `.
- Returns `{ email_sent, sms_sent, errors }`.

Step 4 UI: small `"Send myself a sample"` button next to the notify checkbox. Pulls operator's email/phone from `useAuth()` + `team_members` row. Shows result inline (`Sent to you@example.com and (555) ...`). Disabled while in flight.

### 3. Delivery receipt watch (scoped to Option A)

Migration:
```sql
ALTER TABLE email_send_log     ADD COLUMN archive_log_id uuid REFERENCES team_member_archive_log(id) ON DELETE SET NULL;
ALTER TABLE client_communications ADD COLUMN archive_log_id uuid REFERENCES team_member_archive_log(id) ON DELETE SET NULL;
CREATE INDEX idx_email_send_log_archive ON email_send_log(archive_log_id) WHERE archive_log_id IS NOT NULL;
CREATE INDEX idx_client_comms_archive   ON client_communications(archive_log_id) WHERE archive_log_id IS NOT NULL;
```

Edge function (`archive-team-member`): pass `archive_log_id` into both `sendOrgEmail` (via metadata path that `email_send_log.insert` already uses) and `sendSms` so rows are tagged. Where the existing senders don't accept this field, write a follow-up `UPDATE` keyed on `message_id` / `twilio_sid` immediately after dispatch.

New hook `useArchiveDeliveryReceipts(archiveLogId)`:
- Counts from `email_send_log` (sent count).
- Counts from `client_communications` grouped by `status` (sent / failed) + first 3 error messages.
- Open-rate from `email_tracking_events` joined via `message_id`.

New profile tile `ArchiveDeliveryReceiptCard.tsx` rendered on the archived team-member's profile under the existing reassignment ledger:
- "Delivery — last 24h" header (Termina), refreshes every 60s while < 24h old.
- Stat row: Email sent · SMS sent · SMS failed · Opens.
- Expandable list of failed SMS with reason.
- Honest empty state when nothing was dispatched.

### 4. SMS template description (one-liner)

A single `UPDATE sms_templates SET description = 'Sent automatically to clients reassigned during a team-member archive. Triggered from Team → Archive wizard.' WHERE template_key = 'stylist-reassignment-soft-notify';` so the row reads cleanly inside the existing `SmsTemplatesManager` UI without changing that component.

## Files Touched

**New**
- `supabase/migrations/<ts>_archive_delivery_tracking.sql` — `archive_log_id` columns + indexes + template description update
- `supabase/functions/archive-soft-notify-preview/index.ts` — smoke test sender
- `src/hooks/useArchiveDeliveryReceipts.ts`
- `src/components/dashboard/team-members/archive/ArchiveDeliveryReceiptCard.tsx`

**Edited**
- `src/components/dashboard/team-members/archive/ArchiveWizard.tsx` — collapsible per-client preview, suppression toggles, smoke-test button, plumb `suppressedClientIds`
- `src/hooks/useArchiveTeamMember.ts` — pass `suppressedClientIds` through; expose returned `archive_log_id`
- `supabase/functions/archive-team-member/index.ts` — accept `suppressedClientIds`, skip them; stamp `archive_log_id` on email + SMS rows; return `archive_log_id` in response
- Whichever profile component renders the archived team-member view — mount `<ArchiveDeliveryReceiptCard>` (will locate during build)

## Out of Scope

- Real bounce/complaint capture from Resend (separate wave; requires webhook + new event table)
- 24h+ historical analytics — receipts tile is intentionally short-window
- Editing the email body in a UI (no email-template editor exists for this template; SMS only)
- Re-send / retry from the receipts tile

## Build Gate Checklist

- Tenant scope: every query & mutation filters by `organization_id`; new columns nullable so existing data is unaffected
- RLS: new columns inherit existing table policies (already org-scoped)
- Phase: no AI/forecasting; pure observability + opt-in safety
- Autonomy: smoke test requires explicit operator click; suppression toggles default to on
- UI canon: Termina labels, Aeonik body, no `font-bold`/`font-semibold`, `tokens.card`, `Switch` primitive, calm copy

## Enhancement Suggestions (post-merge)

1. **Resend webhook handler** — capture real bounce/complaint events into a new `email_delivery_events` table; flips the receipts tile from "sent" to "delivered/bounced" semantics.
2. **Receipts → audit timeline merge** — fold the delivery tile into a single "Archive activity" timeline alongside the existing reassignment ledger so operators see one chronological story.
3. **Suppression memory** — when the operator suppresses a client at Step 4, remember the reason ("VIP — call personally") on the client record so future automations skip them too.
4. **Smoke-test rate-limit** — hard cap of 3 previews per operator per hour to prevent cost runaway when someone repeatedly clicks during a long review.