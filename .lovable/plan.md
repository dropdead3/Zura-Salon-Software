

## Phase 1 & Phase 2 Audit: Findings

### Confirmed Working Correctly

1. **Edge Function Auth (`submit-dispute-evidence`)** — Uses `getClaims()` pattern correctly, Zod validation in place, `status` column now included in the select. Solid.

2. **Fraud Warning Webhook** — Idempotent via `23505` duplicate check on `stripe_warning_id`. Org resolution consistent with `handleDisputeCreated`. Platform notification fires correctly with severity mapping.

3. **Charge Succeeded Webhook** — Upsert on `stripe_charge_id` for idempotency. Risk score/level extraction correct. Notification fires only for non-normal risk. Consistent org resolution pattern.

4. **Fraud Alerts UI** — Pagination via `usePaginatedSort`, confirmation dialog for "Mark as Refunded", unresolved count badge. All solid.

5. **High-Risk Payments UI** — Paginated, color-coded badges, BlurredAmount wrapping, MetricInfoTooltip. Solid.

6. **Dispute Analytics** — Win/loss rate, revenue lost, top reason, date-range tooltip. All correct.

7. **Evidence Dialog** — Uses `formatCurrency`, disabled when no evidence entered, Loader2 on submit. Correct.

8. **RLS Policies** — Both `fraud_warnings` and `payment_risk_scores` tables have proper org-scoped RLS. SELECT via `is_org_member`, INSERT/UPDATE/DELETE via `is_org_admin` on fraud_warnings. Risk scores are SELECT-only (webhook writes via service-role). Correct.

9. **Database Indexes** — Both tables have indexes on `organization_id`, `fraud_warnings` has partial index on unresolved actionable warnings, `payment_risk_scores` has indexes on `risk_level` and `created_at DESC`. Good.

---

### Issues Found (3 items)

**1. `handleChargeSucceeded` — org resolution uses wrong column**

Both `handleChargeSucceeded` (line 1535) and `handleEarlyFraudWarning` (line 1470) resolve orgs via `organizations.stripe_connect_account_id`. However, `handleDisputeCreated` (line 1218) uses the same column — so this is actually **consistent**. No bug here, but worth noting: if any org uses `zura_pay_connections` instead of `organizations.stripe_connect_account_id`, these handlers would miss it. The plan doc mentioned "same pattern as `handleDisputeCreated`" which is confirmed correct.

**2. `handleChargeSucceeded` — `appointment_id` resolution is weak**

Line 1529: `const appointmentId = metadata?.appointment_id || null;` — This only finds the appointment if the charge metadata explicitly includes `appointment_id`. Most terminal payments set this on the PaymentIntent metadata, not the Charge metadata. Stripe copies PI metadata to charges in some flows but not all. This means many charges will have `appointment_id: null` in the risk scores table. Not a bug per se (the column is nullable), but it reduces the linkability of risk data to appointments.

**Fix**: Also check `payment_intent` metadata by querying `appointments` by `stripe_payment_intent_id` (same pattern as `handleDisputeCreated` lines 1232-1244).

**3. Notification `link` field missing on risk score notifications**

Line 1565-1577: The `platform_notifications` insert for high-risk payments is missing the `link` field. Fraud warning notifications (line 1498) are also missing `link`. Compare with `handleDisputeCreated` which sets `link` to the dispute page. Without `link`, clicking the notification in the Platform Admin UI won't navigate anywhere.

**Fix**: Add `link: '/dashboard/platform/payment-ops'` (or equivalent) to both notification inserts.

---

### Plan

**File: `supabase/functions/stripe-webhook/index.ts`**

1. In `handleChargeSucceeded`: After extracting `appointmentId` from charge metadata, add a fallback that queries `appointments` by `stripe_payment_intent_id` (if `piId` exists and `appointmentId` is null) — same pattern as `handleDisputeCreated`
2. In `handleChargeSucceeded`: Add `link` field to the platform notification insert
3. In `handleEarlyFraudWarning`: Add `link` field to the platform notification insert

### Technical Details
- Appointment fallback query: `supabase.from("appointments").select("id").eq("stripe_payment_intent_id", piId).maybeSingle()`
- Link value: a dashboard path that resolves to Payment Ops (consistent with existing notification links)
- Both fixes are backend-only — no frontend changes needed

