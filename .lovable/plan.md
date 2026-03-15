

# "Send Payment Setup Link" Tooltip on No-Card State

## Overview

Replace the plain "No card" text in the Entitlements table with a tooltip-wrapped element that lets platform admins send a Stripe-hosted payment setup link to the org. Clicking the action inside the tooltip invokes a new edge function that creates a Stripe Checkout Session in `setup` mode and emails the link to the org's primary owner.

## Changes

### 1. New Edge Function: `send-payment-setup-link`

- Accepts `{ organization_id: string }`
- Authenticates caller as platform user
- Looks up the org's `stripe_customer_id` (or creates a Stripe customer if missing)
- Finds the org's primary owner email from `organization_admins` + `auth.users`
- Creates a Stripe Checkout Session with `mode: 'setup'`, `customer`, and a success URL
- Sends the session URL via the existing `sendEmail` shared utility (Resend)
- Returns `{ success: true, email: '...' }`

### 2. New Hook: `useSendPaymentSetupLink`

A simple `useMutation` wrapper around `supabase.functions.invoke('send-payment-setup-link')` with toast feedback on success/error.

### 3. Modify: `BackroomEntitlementsTab.tsx`

- Import `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` from `@/components/ui/tooltip`
- Import the new `useSendPaymentSetupLink` hook
- Replace the `<span className="text-slate-500">No card</span>` at line 461 with a `Tooltip` wrapping:
  - **Trigger**: The existing "No card" text (with a dashed underline to hint interactivity)
  - **Content**: A small tooltip panel with text "No payment method on file" and a "Send Setup Link" button that calls the mutation with `org.id`
- Show a loading state on the button while the mutation is in flight

### 4. Register function in `supabase/config.toml`

Add `[functions.send-payment-setup-link]` with `verify_jwt = false`.

## Files

| File | Action |
|------|--------|
| `supabase/functions/send-payment-setup-link/index.ts` | New — Stripe setup session + email |
| `src/hooks/platform/useSendPaymentSetupLink.ts` | New — mutation hook |
| `src/components/platform/backroom/BackroomEntitlementsTab.tsx` | Add tooltip with send action on "No card" |
| `supabase/config.toml` | Register new function |

## Technical Notes

- Uses Stripe `checkout.sessions.create` with `mode: 'setup'` — no payment is taken, only card collection
- Email is sent via the existing `sendEmail` utility from `_shared/email-sender.ts`
- Platform-user auth is enforced in the edge function via `is_platform_user` check
- The tooltip uses the existing Radix tooltip from `@/components/ui/tooltip` — no new UI primitives needed

