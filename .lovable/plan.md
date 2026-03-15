

# Cooldown Guard for "Send Payment Setup Link"

## Overview

Add a `last_setup_link_sent_at` timestamp column to `organizations` so the system can enforce a cooldown (1 hour) on setup link emails and show admins when the last link was sent.

## Changes

### 1. Database Migration

Add nullable `last_setup_link_sent_at TIMESTAMPTZ` column to `organizations`.

### 2. Edge Function: `send-payment-setup-link`

- After sending the email successfully, update `organizations.last_setup_link_sent_at = now()` for the org.
- Before sending, check the existing `last_setup_link_sent_at`. If it's less than 1 hour ago, return an error: `{ error: "Setup link was sent recently. Please wait before sending again.", cooldown: true, last_sent_at: <timestamp> }`.

### 3. Hook: `useSendPaymentSetupLink`

- Update the return type to include `last_sent_at` on error responses so the UI can display it.

### 4. UI: `BackroomEntitlementsTab.tsx`

- Fetch `last_setup_link_sent_at` alongside existing org data (it should come through from the orgs query already).
- In the "No card" tooltip:
  - If `last_setup_link_sent_at` exists and is < 1 hour ago: show "Link sent X min ago" in muted text and disable the Send button.
  - If `last_setup_link_sent_at` exists and is > 1 hour ago: show "Last sent X hours ago" and keep the button enabled.
  - If null: show the button as-is (no timestamp info).
- Use `formatRelativeTime` from `@/lib/format.ts` for the timestamp display.

## Files

| File | Action |
|------|--------|
| Migration SQL | Add `last_setup_link_sent_at` column |
| `supabase/functions/send-payment-setup-link/index.ts` | Add cooldown check + timestamp update |
| `src/components/platform/backroom/BackroomEntitlementsTab.tsx` | Show cooldown state in tooltip |

