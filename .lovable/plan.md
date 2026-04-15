

## Phase 1 Audit: Bugs and Gaps Found

### Issues Identified

**1. Edge Function Auth: `getUser()` instead of `getClaims()`**
`submit-dispute-evidence/index.ts` line 36 uses `supabase.auth.getUser(token)` which makes a network call to Supabase Auth. Per project conventions, it should use `getClaims(token)` for faster JWT validation. The function also creates a service-role client but then validates the user JWT against it — this works but is non-standard. Should create an anon-key client with the user's auth header for `getClaims()`, then a separate service-role client for DB writes.

**2. Edge Function: No input validation (Zod)**
`submit-dispute-evidence` does basic `if (!dispute_id)` checks but doesn't use Zod for structured input validation, which is required per edge function patterns.

**3. Edge Function: `disputeRecord.status` reference bug**
Line 128 references `disputeRecord.status` but the select on line 64 only fetches `stripe_dispute_id, metadata` — `status` is not selected. This will always be `undefined`, so the fallback on line 128 silently writes `undefined` as the status when `submit` is false.

**4. Fraud Warnings: No pagination**
`FraudAlertsCard` renders all 50 warnings in one table with no pagination. Should use `usePaginatedSort` consistent with the disputes table.

**5. Fraud Warnings: "Mark Refunded" is misleading**
The "Mark Refunded" button only resolves the warning record — it doesn't actually issue a refund via Stripe. This could confuse operators into thinking a refund was processed. Should either trigger an actual refund or clearly label it "Mark as Refunded" with a confirmation dialog.

**6. Evidence dialog: Currency hardcoded to `$`**
Line 827 uses `$${(dispute.amount / 100).toFixed(2)}` instead of `formatCurrency()`, breaking multi-currency support.

**7. Dispute analytics: Computed on filtered data only**
`DisputeAnalyticsCards` receives the date-filtered `disputes` array, so win/loss rates only reflect the selected date range. This is arguably correct but may confuse operators — consider adding a tooltip clarifying the analytics are scoped to the filtered view.

### Plan

**File 1: `supabase/functions/submit-dispute-evidence/index.ts`**
- Replace `getUser()` with `getClaims()` pattern
- Add Zod validation for request body
- Fix select to include `status` column

**File 2: `src/pages/dashboard/admin/PaymentOps.tsx`**
- Fix hardcoded `$` in evidence dialog — use `formatCurrency` prop
- Add pagination to `FraudAlertsCard` using `usePaginatedSort`
- Add confirmation dialog to "Mark Refunded" action with clarification that no actual refund is issued
- Add tooltip to analytics cards clarifying date-range scope

### Technical Details
- Zod import: `import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"`
- `getClaims` pattern per `disable-jwt-edge-functions` context
- `formatCurrency` already available as prop in both `SubmitEvidenceDialog` (needs threading) and `FraudAlertsCard`

