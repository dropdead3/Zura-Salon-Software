

# Add Polling/Retry After Successful Checkout Redirect

## Problem
When the user returns from Stripe checkout, the webhook that enables the backroom entitlement may not have processed yet (typically 1-5s delay). The current code invalidates queries once, but if the webhook hasn't fired yet, the entitlement check still returns false and the paywall remains visible despite a successful payment.

## Solution
Replace the single `invalidateQueries` call with a small retry loop that checks the entitlement up to 3 times with 2-second intervals. Once entitled, stop polling and show the success toast.

## Implementation

**File:** `src/pages/dashboard/admin/BackroomSettings.tsx` — rewrite the `useEffect` for `checkout=success` (lines 116–129):

1. When `checkout=success` is detected, clean up the URL immediately
2. Start a polling function that:
   - Queries `organization_feature_flags` directly (bypassing cache) to check if `backroom_enabled` is true
   - If true → invalidate all entitlement queries, show success toast, stop
   - If false → wait 2s, retry (max 3 attempts)
   - After 3 failures → still invalidate queries and show a softer message: "Payment received! Your backroom access is being activated — please refresh in a moment."
3. For `checkout=cancelled`, behavior stays the same

This avoids depending on React Query cache timing and gives the webhook up to ~6 seconds to land.

