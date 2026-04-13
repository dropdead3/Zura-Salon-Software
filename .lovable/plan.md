

# Always Show Payouts Section with Inactive State Notice

## Problem
The Payouts & Balance section is conditionally rendered — hidden when Zura Pay isn't active. Instead, it should always be visible, showing an informative notice when Zura Pay is inactive that explains why there's no data and how to activate.

## Changes

### 1. `src/pages/dashboard/admin/PaymentOps.tsx`
- Remove the `{isZuraPayActive && (...)}` conditional wrapper around the Payouts & Balance collapsible
- Always render the Collapsible card
- Inside `CollapsibleContent`, conditionally render either:
  - `<ZuraPayPayoutsTab />` when active
  - A styled notice (using the existing `EmptyState` component or an inline advisory card) when inactive, with:
    - Icon: `Wallet`
    - Title: "Zura Pay Not Active"
    - Description explaining no payout data is available because Zura Pay hasn't been set up, and directing the user to **Settings → Zura Pay** to complete onboarding
    - A CTA button linking to the Zura Pay configurator tab (`/dashboard/admin/settings?tab=terminals`)

### 2. No other file changes
`ZuraPayPayoutsTab.tsx` and the hook remain unchanged.

## Technical Detail

```tsx
<CollapsibleContent>
  <CardContent>
    {isZuraPayActive ? (
      <ZuraPayPayoutsTab />
    ) : (
      <EmptyState
        icon={Wallet}
        title="Zura Pay Not Active"
        description="Payout and balance data will appear here once Zura Pay is activated. Set up your payment account to start processing transactions and receiving payouts."
        action={<Button onClick={() => navigate(settingsPath + '?tab=terminals')}>Activate Zura Pay</Button>}
      />
    )}
  </CardContent>
</CollapsibleContent>
```

| File | Action |
|------|--------|
| `src/pages/dashboard/admin/PaymentOps.tsx` | Remove conditional, add inactive empty state |

