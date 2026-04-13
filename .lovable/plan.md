

# Zura Pay Setup — Bugs, Gaps, and Enhancements

Great instinct to audit the full flow before going live with your S700. Here's everything I found across the onboarding, fleet management, and payment pipeline.

## Bugs

| # | Issue | Impact | Fix |
|---|---|---|---|
| 1 | **Activation Checklist step 3 ("Connect Location") checks `hasTerminalLocations`** — this is the *Stripe* terminal location count, not whether the Zura location itself is connected. A location can be connected to Zura Pay (stripe_account_id set) but have zero terminal locations, leaving step 3 unchecked even though the location *is* linked. | Misleading progress | Split into two steps: "Connect Location" (checks `isLocationConnected`) and "Create Terminal Location" (checks `hasTerminalLocations`). |
| 2 | **`hasFirstTransaction` is hardcoded `false`** in `TerminalSettingsContent.tsx` line 382. The checklist will never complete step 5. | Checklist can never reach 100% | Query for at least one `appointments` row where `paid_at IS NOT NULL` for this org, or check Stripe for charges on the connected account. |
| 3 | **Address parsing is fragile** — `manage-stripe-terminals` parses postal code from the `city` field by splitting on commas. The `locations` table stores city as "Mesa, AZ 85203" with no separate `postal_code` column. If the city format varies (e.g., "Mesa" without state/zip), Stripe gets an empty postal code and the `create_location` call may fail or create a poorly-addressed terminal location. | Terminal location creation may fail | Add a fallback: if parsed postal code is empty, try `state_province` field, and supply a sensible default. Also add the `postal_code` column to the locations table for clean data going forward. |
| 4 | **"Continue Onboarding" doesn't pass `return_url`/`refresh_url`** — In `ZuraPayFleetTab.tsx` line 403, the pending-state "Continue Onboarding" button calls `onStartConnect?.()` directly. But `onStartConnect` in `TerminalSettingsContent.tsx` (line 417) *does* pass the URLs. So this is actually wired correctly now. However, the `onStartConnect` prop calls `connectMutation.mutate()` which invokes `create_account_and_link` — this requires `return_url` and `refresh_url` per the Zod schema. **This works.** No bug here after the previous fix. | N/A | Confirmed working. |

## Gaps

| # | Gap | Recommendation |
|---|---|---|
| 5 | **No `postal_code` column on `locations` table** — Stripe Terminal requires a valid postal code for location creation. Currently relies on fragile string parsing. | Add a `postal_code` column (nullable text) to the `locations` table via migration. Update the edge function to prefer the column, falling back to the parsed value. |
| 6 | **No webhook for Connect account status updates** — The `verify-zura-pay-connection` function only runs when a user clicks "Check Status." If Stripe finishes verification while the user isn't on the page, the status stays `pending` until they manually check. | Add a `account.updated` Stripe webhook handler that auto-updates `organizations.stripe_connect_status` when `charges_enabled` flips to `true`. |
| 7 | **No location-level disconnect** — Once a location is connected, there's no UI to disconnect it (remove `stripe_account_id`). If a location is set up incorrectly, there's no way to undo it without database access. | Add a "Disconnect Location" action with confirmation dialog. |
| 8 | **Checklist doesn't link to the relevant action** — Each checklist step is display-only. Clicking "Create Account" should scroll to or highlight the connect button; "Pair Reader" should open the register dialog. | Make checklist steps clickable with callbacks to trigger the relevant action. |

## Enhancements

| # | Enhancement | Value |
|---|---|---|
| 9 | **Auto-connect location after org verification** — For single-location orgs, automatically connect the only location when `stripe_connect_status` flips to `active`, eliminating a manual step. | Reduces setup friction for the majority of customers (single-location salons). |
| 10 | **Reader health polling** — Reader status is fetched once and cached for 30s. For an active setup session, this means a newly-registered reader might show "offline" even after it connects. | Add a manual "Refresh" button on the readers card, and reduce `staleTime` to 10s while the Fleet tab is active. |
| 11 | **Test transaction guidance** — After pairing, provide an inline "Process Test Payment" button that creates a $0.50 test charge and walks the user through tapping a card on the S700. | Completes the activation checklist end-to-end without leaving the settings page. |

## Proposed File Changes

| # | File | Change |
|---|---|---|
| 1 | `ZuraPayActivationChecklist.tsx` | Split step 3 into "Connect Location" and "Create Terminal Location". Add `isLocationConnected` prop. |
| 2 | `TerminalSettingsContent.tsx` | Pass `isLocationConnected` to checklist. Query `hasFirstTransaction` from DB instead of hardcoding `false`. |
| 3 | `manage-stripe-terminals/index.ts` | Improve address parsing with fallback logic; prefer `postal_code` column if present. |
| 4 | **DB migration** | Add nullable `postal_code` text column to `locations` table. |
| 5 | `ZuraPayFleetTab.tsx` | Add "Refresh Readers" button; add location disconnect action. |
| 6 | `useStripeTerminals.ts` | Add `refetch` exposure and reduce `staleTime` option. |

## Priority Order
1. Fix checklist accuracy (bugs 1-2) — immediate, affects what you see right now
2. Address parsing hardening (bug 3 + gap 5) — blocks clean terminal location creation with your S700
3. Reader refresh (enhancement 10) — quality-of-life for the setup session you're about to do
4. Webhook for auto-status (gap 6) — important for production but not blocking your test setup

