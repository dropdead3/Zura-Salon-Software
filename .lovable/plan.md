

# Fix: Bank Account Last4 Not Displaying

## Problem
The `orgBankLast4` prop is sourced from `verifyMutation.data?.bank_last4`, which is only populated **after** the user clicks "Check Status" in the current session. On page load, the mutation has no data, so the last4 is always null.

## Solution
Add a dedicated query hook (`useOrgBankLast4`) that calls the verify edge function on load when the org is already active and has a Stripe account. This ensures `bank_last4` is available immediately without requiring a manual verify click.

## Changes

### 1. `src/hooks/useZuraPayConnect.ts`
Add a new query hook:
```typescript
export function useOrgBankLast4(orgId: string | undefined, stripeAccountId: string | null | undefined) {
  return useQuery({
    queryKey: ['org-bank-last4', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('verify-zura-pay-connection', {
        body: { organization_id: orgId },
      });
      if (error) throw error;
      return data?.bank_last4 as string | null;
    },
    enabled: !!orgId && !!stripeAccountId,
    staleTime: 5 * 60 * 1000, // 5 minutes — bank info rarely changes
  });
}
```

### 2. `src/components/dashboard/settings/TerminalSettingsContent.tsx`
- Import and call `useOrgBankLast4(orgId, connectStatus?.stripe_connect_account_id)`
- Change the prop from `verifyMutation.data?.bank_last4` to the query result:
```typescript
orgBankLast4={bankLast4Query.data ?? verifyMutation.data?.bank_last4 ?? null}
```

This way the last4 loads automatically when the page opens, and also updates if the user manually verifies.

| File | Change |
|------|--------|
| `src/hooks/useZuraPayConnect.ts` | Add `useOrgBankLast4` query hook |
| `src/components/dashboard/settings/TerminalSettingsContent.tsx` | Use query result for `orgBankLast4` prop |

