

# Add Location Name, Bank Account Last4, and Label Clarity to Fleet Tab

## Changes

### 1. Edge Function: `supabase/functions/verify-zura-pay-connection/index.ts`

After retrieving the Stripe account (line 84), extract the bank account last4 from `account.external_accounts.data[0].last4` (available on Connect Express accounts). Return it as `bank_last4` in the response alongside the existing fields.

### 2. Frontend Hook: `src/hooks/useZuraPayConnect.ts`

- Add `bank_last4` to the `VerifyResult` interface
- Store it in the org connect status query or pass it through to the Fleet tab
- Add `bank_last4` to `useOrgConnectStatus` by storing it after verification (or add a new piece of state)

### 3. Fleet Tab UI: `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx`

Three changes on the "org active, location not connected" screen (lines 480-523):

- **Heading**: Change `ENABLE ZURA PAY FOR THIS LOCATION` to `ENABLE ZURA PAY FOR {selectedLoc.name}` (already available via `selectedLoc` on line 217)
- **"Use Organization Account" button area**: Add a subtitle showing the org's bank account ending, e.g. "Payouts to account ending in ••1234". This requires passing `bank_last4` as a new prop.
- **Label clarity**: Add helper text like "Select preferred payout destination" above the two buttons to clarify users are choosing which bank account receives payouts.

### 4. Props: `ZuraPayFleetTabProps`

Add `orgBankLast4?: string | null` prop to pass the bank last4 from the parent (`TerminalSettingsContent`) down to the Fleet tab.

### 5. Parent Component

Pass the `bank_last4` from the verify response through to the Fleet tab. This likely lives in `TerminalSettingsContent.tsx` — will need to store the last4 from the verify mutation result and pass it as a prop.

---

| File | Change |
|------|--------|
| `supabase/functions/verify-zura-pay-connection/index.ts` | Extract and return `bank_last4` from Stripe account |
| `src/hooks/useZuraPayConnect.ts` | Add `bank_last4` to `VerifyResult` interface |
| `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx` | Use location name in heading, show bank last4, add payout destination label |
| `src/components/dashboard/settings/terminal/TerminalSettingsContent.tsx` | Pass `orgBankLast4` prop through to FleetTab |

