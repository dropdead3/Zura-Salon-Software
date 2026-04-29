## Goal

Replace the placeholder `email_send_log` rows currently inserted by `archive-team-member` with real, branded sends through the project's existing org email + SMS pipeline, and surface the resulting counts to the operator on success.

## Why use the existing pipeline (not the Lovable transactional scaffold)

This codebase already has a multi-tenant email infrastructure:
- `supabase/functions/_shared/email-sender.ts` → `sendOrgEmail()` (Resend, org-branded, opt-out aware)
- `supabase/functions/_shared/sms-sender.ts` → `sendSms()` (per-org Twilio, template-driven)

Introducing `send-transactional-email` (Lovable scaffold) would create a parallel email system, fight existing org-branding, and break the project's domain model. We use what's already wired in.

## Changes

### 1. New SMS template seed (DB migration)

Insert one row into `sms_templates`:
- `template_key`: `stylist-reassignment-soft-notify`
- `message_body`: `Hi {{first_name}}, {{archived_stylist}} is no longer with us. {{new_stylist}} will be taking great care of you — same level, same pricing. See you at your next visit! — {{org_name}}`
- `is_active`: true

### 2. Inline branded HTML email (no new shared template file)

Inside `archive-team-member/index.ts`, build a small inline HTML body matching the brand voice (white background, brand color H1, plain copy, no unsubscribe footer — `sendOrgEmail` appends the org footer/unsubscribe automatically).

Subject: `A quick update about your stylist`

Body interpolates: client first name, archived stylist name, new stylist name, org name.

### 3. Rewrite the soft-notify block in `archive-team-member/index.ts`

Replace the current `email_send_log.insert(...)` placeholder path with real dispatch:

For each affected client (those whose `preferred_stylist_id` now equals the new stylist):
- If they have an opted-in email (`reminder_email_opt_in !== false`):
  - Call `sendOrgEmail(supabaseAdmin, organizationId, { to: [email], subject, html, clientId, emailType: 'transactional' })`
  - On `success && !skipped` → increment `clients_emailed`
  - On `skipped` (opt-out / rate-limit) → increment `clients_skipped`
  - On error → increment `clients_skipped`, log
- Else if they have an opted-in phone (`reminder_sms_opt_in !== false`):
  - Call `sendSms(supabaseAdmin, organizationId, { to: phone, templateKey: 'stylist-reassignment-soft-notify', variables: { first_name, archived_stylist, new_stylist, org_name } })`
  - On `success` → increment `clients_sms`, else `clients_skipped`
- Else → increment `clients_skipped`

Keep all sends inside the existing try/catch so failures stay non-fatal to the archive.

The returned `notify_summary` shape stays the same:
`{ internal_pings, clients_emailed, clients_sms, clients_skipped }`

### 4. Surface `notify_summary` in the success toast

`src/hooks/useArchiveTeamMember.ts`:
- Capture `data.notify_summary` from the mutation response
- In `onSuccess`, build a description string conditionally:
  - If `clients_emailed + clients_sms + clients_skipped > 0`:
    `Notified ${emailed} by email, ${sms} by SMS, ${skipped} skipped. Pinged ${internal_pings} teammate${internal_pings === 1 ? '' : 's'}.`
  - Else if `internal_pings > 0`:
    `Pinged ${internal_pings} teammate${...}.`
  - Else: omit description
- Pass as `toast.success('Team member archived', { description })`

### 5. Resolve org name once, up-front

Add a single lookup at the top of the side-effect block:
```ts
const { data: org } = await supabaseAdmin
  .from('organizations')
  .select('name')
  .eq('id', body.organizationId)
  .maybeSingle();
const orgName = org?.name ?? 'Our team';
```
Used in both email HTML and SMS template variables.

## Files Touched

- `supabase/migrations/<new>.sql` — insert SMS template (idempotent: `ON CONFLICT (template_key) DO NOTHING`)
- `supabase/functions/archive-team-member/index.ts` — replace placeholder dispatch with `sendOrgEmail` / `sendSms`; add org-name lookup
- `src/hooks/useArchiveTeamMember.ts` — surface `notify_summary` in toast description

## Out of Scope

- Bulk-by-load smart split UI changes (already shipped earlier)
- Adding new email templates to a shared template directory — inline HTML is sufficient and matches existing transactional patterns in this codebase
- Lovable transactional email scaffold (`send-transactional-email`) — incompatible with the project's existing org-branded pipeline
- Undo window and ledger replay view — captured as future enhancements

## Enhancement Suggestions (post-merge)

1. **Per-client preview before commit** — Step 4 expandable list showing exactly which 8 clients get email vs which 3 get SMS, with per-row toggles to suppress.
2. **Delivery receipt watch** — track `notify_summary.archive_log_id` against `email_send_log` / `client_communications` over the next 24h and surface bounce/failure counts on the archived team member's profile.
3. **SMS template management UI** — expose `stylist-reassignment-soft-notify` in the existing SMS template editor so org admins can tweak the message voice without a code change.
