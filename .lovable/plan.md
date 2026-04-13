

# Zura Pay Self-Serve Onboarding via Stripe Connect Express

## Problem
Currently, `stripe_account_id` on locations is manually provisioned by platform admins. Org admins see "Contact your account manager" — a dead end. There's no edge function for creating Stripe Connect accounts or generating onboarding links.

## Architecture

```text
Org Admin clicks "Connect to Zura Pay" on a location
  → Frontend calls edge function `connect-zura-pay`
  → Edge function creates a Stripe Express connected account (if org doesn't have one yet)
  → Edge function creates an Account Link (onboarding URL)
  → Writes stripe_account_id + status='pending' to locations table
  → Returns onboarding URL
  → Frontend redirects org admin to Stripe-hosted onboarding
  → On return, frontend calls `verify-zura-pay-connection` to check account status
  → Edge function polls Stripe for charges_enabled / payouts_enabled
  → Updates locations table with stripe_status='active', stripe_payments_enabled=true
```

**Key design decisions:**
- One Stripe Connect Express account per **organization** (not per location) — the account is shared across locations
- `stripe_account_id` stored on the `organizations` table (new column) AND referenced per-location
- Stripe handles all identity verification, bank account collection, compliance
- Zura branding appears on the Stripe-hosted onboarding via Connect Settings

## Changes

### 1. Database migration
- Add `stripe_connect_account_id` and `stripe_connect_status` columns to `organizations` table
- The per-location `stripe_account_id` continues to be populated from the org-level account
- Add RLS policies for org admins to read their own connect status

### 2. New edge function: `connect-zura-pay`
**Actions:**
- `create_account` — Creates a Stripe Express account for the org (if none exists), stores `stripe_connect_account_id` on the org
- `create_onboarding_link` — Generates an Account Link for the org's connected account, returns URL
- `connect_location` — Once the account is verified, writes `stripe_account_id` to the location, sets status to `active`

**Flow:**
1. Validates user is org admin/owner
2. Checks if org already has a `stripe_connect_account_id`
3. If not, calls `stripe.accounts.create({ type: 'express', capabilities: { card_payments: { requested: true }, transfers: { requested: true } } })`
4. Creates Account Link with `return_url` and `refresh_url` pointing back to Zura Pay settings
5. Returns `{ onboarding_url, account_id }`

### 3. New edge function: `verify-zura-pay-connection`
- Called when org admin returns from Stripe onboarding
- Retrieves the Stripe account, checks `charges_enabled` and `details_submitted`
- Updates org `stripe_connect_status` to 'active' or 'pending'
- When active, populates `stripe_account_id` on the selected location(s)

### 4. Updated Fleet Tab UI
**File:** `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx`

Replace the "Contact your account manager" empty state with a self-serve flow:

- **Not connected, no org account**: Show "Connect to Zura Pay" button → calls edge function → redirects to Stripe
- **Pending (returned from onboarding, not yet verified)**: Show "Verification in Progress" with a "Check Status" button
- **Active org account, location not connected**: Show "Enable Zura Pay for this location" button → calls `connect_location`
- **Active**: Show existing fleet management UI (as-is)

### 5. Return URL handler
**File:** `src/components/dashboard/settings/TerminalSettingsContent.tsx`

Detect `?zura_pay_return=true` query param when returning from Stripe onboarding. Automatically call `verify-zura-pay-connection` and show status feedback.

### 6. Fix build error (stale `LocationWithStripe` reference)
The build error from `LocationWithStripe` appears to be resolved in the current code — the file uses `LocationWithPayment`. If a rebuild still fails, this will be verified and fixed.

## Files Modified/Created
| File | Action |
|------|--------|
| `supabase/functions/connect-zura-pay/index.ts` | New — Create Express account + Account Link |
| `supabase/functions/verify-zura-pay-connection/index.ts` | New — Check onboarding status, update DB |
| `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx` | Replace "contact manager" with self-serve connect flow |
| `src/components/dashboard/settings/TerminalSettingsContent.tsx` | Handle return URL, call verify on return |
| `src/hooks/useZuraPayConnect.ts` | New — Hook for connect + verify mutations |
| Migration | Add `stripe_connect_account_id`, `stripe_connect_status` to `organizations` |

## Technical Details
- Stripe Connect Express: Stripe hosts the entire onboarding UX (identity verification, bank account, tax info). Zura's brand appears via Connect Settings.
- The `STRIPE_SECRET_KEY` is already available in edge functions (used by 17+ existing functions).
- Account Links expire after a short time — the refresh URL generates a new one.
- Per-location `stripe_account_id` is populated from the org-level connect account, enabling multi-location orgs to connect once and enable locations individually.
- All terminal operations (create location, register reader) continue to require `stripe_account_id` on the location — the server-side guard in `manage-stripe-terminals` remains unchanged.

