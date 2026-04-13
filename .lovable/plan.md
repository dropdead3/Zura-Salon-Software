

# Support S700 Reader Model Alongside S710

## Context
The codebase hardcodes "S710" across UI copy, marketing text, hardware ordering, and the simulator. Your S700 is fully compatible with the same Stripe Terminal API — the registration wizard, payment intents, and reader display commands all work identically. The only gap is **copy and labeling**.

## Approach
Generalize references from "S710" to "S700/S710" or the generic "Zura Pay Reader" where appropriate, so the experience is accurate regardless of which model is connected. The simulator and technical specs remain S710-focused (since that's the production target), but registration, fleet management, and hardware ordering should acknowledge both models.

## File Changes

| # | File | Change |
|---|---|---|
| 1 | `src/components/dashboard/settings/terminal/ZuraPayHardwareTab.tsx` | Update product name strings from "S710" to "S700/S710" in order dialog, line items, and info callouts. Keep SKU IDs unchanged. |
| 2 | `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx` | Update any reader-type display labels to show actual `device_type` from Stripe (e.g. "verifone_P400", "stripe_s700") instead of hardcoded "S710". |
| 3 | `src/components/dashboard/settings/terminal/ZuraPayConnectivityTab.tsx` | Change "S710" references to "S700/S710" in connectivity/offline copy. |
| 4 | `src/components/dashboard/settings/terminal/ZuraPayTippingTab.tsx` | Change "S710" to "S700/S710" in the tipping description. |
| 5 | `src/components/dashboard/settings/OfflinePaymentStatus.tsx` | Update "S710" references to "S700/S710" in banner and badge text. |
| 6 | `src/components/marketing/NeverDownPayments.tsx` | Update marketing copy from "S710" to "S700/S710". |
| 7 | `src/components/platform/stripe/TerminalRequestsTable.tsx` | Update reason label from "Upgrade to S710" to "Upgrade to S700/S710". |
| 8 | `supabase/functions/terminal-hardware-order/index.ts` | Update fallback product name from "Zura Pay Reader S710" to "Zura Pay Reader S700/S710". |
| 9 | `supabase/functions/manage-terminal-requests/index.ts` | Update `device_type` default and valid reasons to include "s700". |

## What stays unchanged
- **S710CheckoutSimulator** — the simulator is specifically for the S710's 1080×1920 display and stays S710-branded (the S700 shares the same screen specs).
- **Registration wizard** — already model-agnostic (uses Stripe's pairing code API which works for any reader model).
- **Payment intent / reader display edge functions** — already model-agnostic.

## Result
Your S700 will register, pair, and process payments using the existing infrastructure. UI copy will accurately reflect that both S700 and S710 models are supported.

