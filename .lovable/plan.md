

# Zura Pay Organization Isolation Audit

## Verdict: Mostly Solid — 2 Cross-Contamination Risks Found

The vast majority of Zura Pay is correctly org-scoped. Every financial edge function authenticates the caller, most verify org membership, and all Stripe API calls route through the org's own Connected Account ID (`stripeAccount: org.stripe_connect_account_id`). Webhook handlers resolve org via `stripe_connect_account_id` lookups, preventing cross-org writes.

However, two edge functions have membership check gaps that could allow an authenticated user from Org A to trigger actions on Org B.

---

## Issue 1: `create-terminal-payment-intent` — No Org Membership Verification (Critical)

**Lines 89-108** check `organization_admins` and then fall back to `user_roles`, but the `user_roles` query **does not filter by `organization_id`**. A stylist in Org A who passes `organization_id: <Org B's ID>` would pass the role check because their role exists globally, not scoped to Org B.

```typescript
// CURRENT (lines 97-107) — BROKEN
const { data: roles } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", user.id);  // ← No org filter!
const hasRole = roles?.some(r => ["admin","manager","super_admin","stylist"].includes(r.role));
```

**Fix**: Replace with `employee_profiles` membership check (same pattern used in `charge-card-on-file`, `collect-booking-deposit`, `zura-pay-payouts`):
```typescript
const { data: membership } = await supabase
  .from("employee_profiles")
  .select("user_id")
  .eq("user_id", user.id)
  .eq("organization_id", organization_id)
  .eq("is_active", true)
  .maybeSingle();
if (!membership) return jsonResponse({ error: "Forbidden" }, 403);
```

---

## Issue 2: `terminal-reader-display` — Same Broken Pattern (Critical)

**Lines 64-82** use the identical `organization_admins` → global `user_roles` fallback. Same vulnerability — any authenticated user with a stylist role in *any* org could push display content or initiate payment collection on *another org's* reader.

**Fix**: Same `employee_profiles` membership check as above.

---

## What's Already Correct

| Function | Auth | Membership Check | Org-Scoped Stripe Calls |
|---|---|---|---|
| `charge-card-on-file` | JWT + getUser | `employee_profiles` ✅ | `stripeAccount` ✅ |
| `collect-booking-deposit` | JWT + getUser | `employee_profiles` ✅ | `stripeAccount` ✅ |
| `zura-pay-payouts` | JWT + getUser | `employee_profiles` ✅ | `stripeAccount` ✅ |
| `connect-zura-pay` | JWT + getUser | `is_org_admin` RPC ✅ | `stripeAccount` ✅ |
| `verify-zura-pay-connection` | JWT + getUser | `is_org_member` RPC ✅ | `stripeAccount` ✅ |
| `manage-stripe-terminals` | JWT + getUser | `organization_members` ✅ | `stripeAccount` via location ✅ |
| `create-terminal-payment-intent` | JWT + getUser | ❌ Global role check | `stripeAccount` ✅ |
| `terminal-reader-display` | JWT + getUser | ❌ Global role check | `stripeAccount` ✅ |
| `stripe-webhook` | Signature verification | N/A (server-to-server) | Resolves org from `stripe_connect_account_id` ✅ |

### Webhook Isolation
- Platform events (invoice, subscription) resolve org via `stripe_customer_id` — no cross-contamination possible
- Connect events (card sync, disputes, refunds) resolve org via `stripe_connect_account_id` — isolated by design
- Card operations (`setup_intent.succeeded`, `payment_method.detached/updated`, `customer.deleted`) all double-filter on both `stripe_payment_method_id` AND `organization_id`

### Frontend Isolation
- `useOrgConnectStatus` — filters by `orgId` ✅
- `useZuraPayPayouts` — passes `orgId` to edge function ✅
- `PaymentOps.tsx` — all queries filter by `orgId!` ✅
- `useConnectZuraPay`, `useVerifyZuraPayConnection`, `useConnectLocation` — all pass `organizationId` ✅

### Database Isolation
- `payment_disputes` table has `organization_id` + RLS ✅
- `client_cards_on_file` queries always include `.eq("organization_id", ...)` ✅
- `appointment_fee_charges` inserts always include `organization_id` ✅

---

## Implementation Plan

| File | Change |
|---|---|
| `supabase/functions/create-terminal-payment-intent/index.ts` | Replace `organization_admins` + global `user_roles` check with `employee_profiles` membership check |
| `supabase/functions/terminal-reader-display/index.ts` | Replace `organization_admins` + global `user_roles` check with `employee_profiles` membership check |

Two files, ~15 lines each. No migrations. No UI changes.

