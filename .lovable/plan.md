

# Payout Schedule Configurator & Bank Account Card

## Current State
- The `zura-pay-payouts` edge function **already supports** `action: 'update_schedule'` and returns `payout_schedule` from Stripe
- The `useZuraPayPayouts` hook **already types** `PayoutSchedule` with `interval`, `weekly_anchor`, `monthly_anchor`, `delay_days`
- The `ZuraPayPayoutsTab` UI shows balance + payout history but **does not render** the schedule or offer a way to change it
- No bank account information is surfaced anywhere

## Plan

### 1. Extend Edge Function to Return Bank Account Info
Add the connected bank account details from Stripe's `external_accounts` to the response. The `account` object is already fetched (line 114), so extract the default bank account:

```typescript
const defaultBank = (account.external_accounts?.data || []).find(
  (ea: any) => ea.object === 'bank_account' && ea.default_for_currency
);
```

Return: `{ bank_name, last4, routing_number (last 4), currency, status }` — no full account numbers.

### 2. Update Hook Types
Add `bank_account` to `ZuraPayPayoutsData` interface. Add `useUpdatePayoutSchedule` mutation that calls the existing `update_schedule` action.

### 3. Add Payout Schedule Card to UI
Insert a card between the summary KPIs and the payouts table showing:
- Current schedule (Daily / Weekly / Monthly) as radio group
- Weekly anchor day picker (Mon–Fri, shown only when Weekly is selected)
- Monthly anchor date picker (1–28, shown only when Monthly is selected)
- Save button that calls `update_schedule`
- Current `delay_days` displayed as read-only info ("Payouts arrive T+2 days")

### 4. Add Bank Account Card to UI
Insert a card alongside the schedule card showing:
- Bank name + last 4 digits
- Status badge (verified / new / errored)
- Note: "To update your bank account, contact support" (Stripe Express doesn't allow self-service bank changes via API without a dashboard link)
- If no bank account: empty state prompting to complete onboarding

## Files

| File | Action |
|---|---|
| `supabase/functions/zura-pay-payouts/index.ts` | Add `bank_account` to response from `account.external_accounts` |
| `src/hooks/useZuraPayPayouts.ts` | Add `BankAccountInfo` type, add `useUpdatePayoutSchedule` mutation |
| `src/components/dashboard/settings/terminal/ZuraPayPayoutsTab.tsx` | Add Payout Schedule card (radio group + anchor pickers) and Bank Account card |

No migrations. No new edge functions — reuses the existing `update_schedule` action.

