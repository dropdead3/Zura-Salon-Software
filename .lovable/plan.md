

# Auto-Ban on Dispute — Org Setting + Webhook Automation

## What This Does
Adds a toggle in settings that lets an organization automatically ban clients when they file a payment dispute. When enabled, the Stripe webhook that processes `charge.dispute.created` will immediately set the client's `is_banned` flag, record the ban reason, and log an audit trail — no manual intervention needed.

This follows the autonomy model: the org explicitly opts in (approval), and the system executes within that guardrail.

## Design Decisions

- **Setting storage**: Uses the existing `backroom_settings` key-value table (org-scoped, already has hooks and RLS). Setting key: `dispute_policy` with value `{ auto_ban_on_dispute: boolean }`.
- **Webhook-side execution**: The `handleDisputeCreated` function already resolves `client_id`. After inserting the dispute, it checks the org's `dispute_policy` setting and bans the client if enabled.
- **UI placement**: A new "Dispute Policy" card placed alongside the existing Cancellation Fee Policies in the Website/Booking settings area — both are client protection policies that logically group together.
- **Ban reason**: Auto-set to `"Auto-banned: payment dispute filed (dispute #{stripe_dispute_id})"` so it's clear in the client profile why the ban occurred.

## Implementation

### 1. Webhook Enhancement (`stripe-webhook/index.ts`)
After the dispute insert (line ~1128), add:
- Query `backroom_settings` for key `dispute_policy` where `organization_id = org.id` and `location_id IS NULL`
- If `setting_value.auto_ban_on_dispute === true` and `clientId` is resolved:
  - Update `phorest_clients` set `is_banned = true`, `ban_reason`, `banned_at`, `banned_by = null` (system action)
  - Insert audit log via `log_platform_action` RPC

### 2. UI Toggle Component (new: `DisputePolicySettings.tsx`)
A small card with:
- Title: "Dispute Policy"
- Description explaining the auto-ban behavior
- Single Switch toggle for auto-ban
- Uses `useColorBarSetting('dispute_policy')` to read and `useUpsertColorBarSetting` to write
- Warning text when enabled: "Clients who file a payment dispute will be automatically banned from booking."

### 3. Surface in Settings Page
Import and render `DisputePolicySettings` in `WebsiteSettingsContent.tsx` next to the Cancellation Fee Policies section.

## Files

| File | Action |
|---|---|
| `supabase/functions/stripe-webhook/index.ts` | Add auto-ban logic after dispute insert |
| `src/components/dashboard/settings/DisputePolicySettings.tsx` | **New** — toggle card for auto-ban setting |
| `src/components/dashboard/settings/WebsiteSettingsContent.tsx` | Import and render `DisputePolicySettings` |

No migrations. No new tables. Reuses existing `backroom_settings` infrastructure and `phorest_clients.is_banned` columns.

