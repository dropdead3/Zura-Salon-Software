

# Update "Use Organization Account" Button Text

## Change

In `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx`:

1. **Line 506**: Change button text from `Use Organization Account` to dynamically show `Use Account Ending in ••{orgBankLast4}` when `orgBankLast4` is available, falling back to `Use Organization Account` when it's not.

2. **Lines 508-512**: Remove the subtitle `<span>` that shows "Payouts for {location} to account ending in ••{last4}" since that info now lives in the button itself.

| File | Change |
|------|--------|
| `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx` | Update button label, remove subtitle span |

