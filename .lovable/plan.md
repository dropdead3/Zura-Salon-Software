

# Fix Zura Pay Initial State and Add Onboarding Confirmation

## Problem
1. The `organizations.stripe_connect_status` is `'pending'` in the DB, causing the UI to show "Verification in Progress" even though you never intentionally activated anything.
2. The "Start Setup" button immediately creates a Stripe Express account with no confirmation — if the user abandons the onboarding form, they're stuck in a `pending` state with no way to reset.
3. The "Continue Onboarding" button constructs `return_url` and `refresh_url` but isn't passing them when calling `create_account_and_link` (which reuses the existing account and generates a new Account Link). The Zod schema requires valid URLs for this action, so the call may fail silently.

## Changes

| # | File / Action | Change |
|---|---|---|
| 1 | **Database migration** | Reset `stripe_connect_status` to `'not_connected'` and clear `stripe_connect_account_id` for your org so you start fresh. This is a one-time data fix. |
| 2 | `ZuraPayFleetTab.tsx` — "CONNECT TO ZURA PAY" section | Add a confirmation dialog before "Start Setup" so users understand they're creating a payment account. Prevents accidental activation. |
| 3 | `ZuraPayFleetTab.tsx` — "VERIFICATION IN PROGRESS" section | Add a "Reset / Start Over" option (visible to admins) that calls a new edge function to delete the Stripe Express account and reset the org status to `not_connected`. This handles abandoned onboarding gracefully. |
| 4 | `connect-zura-pay/index.ts` | Add a new action `reset_account` that deletes the Stripe Express account (if no charges have been processed) and resets the org's `stripe_connect_account_id` and `stripe_connect_status` to `null` / `not_connected`. |
| 5 | `useZuraPayConnect.ts` | Add a `useResetZuraPayAccount` mutation hook for the reset action. |

## Technical Details

**Reset Account action** (edge function):
- Validates the caller is an org admin
- Checks no charges have been processed on the account (`stripe.accounts.retrieve`)
- Calls `stripe.accounts.del(accountId)` to remove the Express account
- Updates org: `stripe_connect_account_id = null`, `stripe_connect_status = 'not_connected'`
- Also clears any location-level `stripe_account_id` references

**Confirmation dialog** (before Start Setup):
- Simple AlertDialog: "This will create a Zura Pay payment account for your organization. You'll be redirected to complete identity verification. Continue?"
- Only proceeds to call the edge function on confirm

## Result
- You'll see a clean "Connect to Zura Pay" state instead of the false "Verification in Progress"
- Future users can't accidentally get stuck in pending state
- Admins can reset abandoned onboarding attempts

