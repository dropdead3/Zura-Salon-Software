

# Move Zura Payroll to "Coming Soon"

Payroll is not fully built yet, so it should not appear as "Available" in the Explore section — it belongs with the other Coming Soon apps.

## Changes

### `src/pages/dashboard/AppsMarketplace.tsx`

1. **Move Payroll from `SUBSCRIBED_APPS` to `EXPLORE_APPS`** — cut the payroll entry (lines 81-95) from `SUBSCRIBED_APPS` and insert it at the top of `EXPLORE_APPS` with `comingSoon: true` and a `missedOpportunity` line.

2. **Remove payroll entitlement logic** — remove the `usePayrollEntitlement` import and hook call since Payroll no longer needs entitlement checking on this page. Remove the `payroll` case from `getActiveStatus`. Remove `payrollLoading` from the `isLoading` compound check.

3. **Result**: Payroll renders in the Explore section with the lock icon, "Coming Soon" badge, and "Notify Me" / "Learn More" CTAs — identical to Marketer, Reputation, Reception, and Hiring.

### Payroll entry in `EXPLORE_APPS` (inserted first):
```typescript
{
  key: 'payroll',
  name: 'Zura Payroll',
  tagline: 'Compensation Intelligence',
  valueStatement: 'Full-service payroll powered by Gusto — automated taxes, direct deposit, and commission integration.',
  features: [
    'Gusto-powered payroll processing',
    'Automated tax compliance',
    'Direct deposit & W-2s',
    'Commission payout integration',
  ],
  icon: DollarSign,
  gradient: 'from-emerald-500/30 to-green-500/30',
  accentColor: 'border-emerald-500/30',
  comingSoon: true,
  missedOpportunity: 'Manual payroll costs operators 5+ hours per cycle. Automate it.',
}
```

No database or backend changes needed — this is purely a marketplace presentation change. The existing payroll entitlement hook and subscription gate on the actual payroll pages remain intact for when the feature launches.

