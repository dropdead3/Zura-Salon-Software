

# Update Payout Destination Text with Location Name

## Change

One line edit in `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx` (line 510):

**From:** `Payouts to account ending in ••{orgBankLast4}`

**To:** `Payouts for {selectedLoc.name} to account ending in ••{orgBankLast4}`

This adds location context so operators know exactly which location's payouts will route to the displayed bank account.

| File | Change |
|------|--------|
| `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx` | Update payout subtitle text to include location name |

