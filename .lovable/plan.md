

# Zura Pay Ship-Readiness Audit

## Status: Nearly Ready — 6 Issues to Resolve

### Critical Issues

**1. Missing `config.toml` entries (7 edge functions)**
These Zura Pay edge functions exist but have no `[functions.xxx]` block in `supabase/config.toml`. Without the `verify_jwt = false` entry, they default to JWT verification at the gateway level, which can cause silent 401s depending on how they're invoked:

| Function | Purpose |
|---|---|
| `zura-pay-payouts` | Balance + payout history |
| `create-terminal-payment-intent` | POS checkout PI creation |
| `terminal-reader-display` | S710 display push |
| `terminal-hardware-order` | Hardware purchase checkout |
| `manage-stripe-terminals` | Fleet CRUD |
| `charge-card-on-file` | Fee collection on saved cards |
| `collect-booking-deposit` | Deposit capture |

**Fix**: Add 7 `[functions.xxx] verify_jwt = false` blocks to `config.toml`.

---

**2. Incomplete CORS headers on `charge-card-on-file`**
The function's `Access-Control-Allow-Headers` only lists `authorization, x-client-info, apikey, content-type` — missing the `x-supabase-client-platform*` and `x-supabase-client-runtime*` headers that modern Supabase JS clients send. This will cause CORS preflight failures in some browsers/versions.

**Fix**: Update to the full CORS header set matching the standard used in other functions.

---

**3. `zura-pay-payouts` uses deprecated `getClaims()` for auth**
This function calls `supabase.auth.getClaims(token)` which is not a standard Supabase JS method. It should use `supabase.auth.getUser()` like the other hardened payment functions (`charge-card-on-file`, `collect-booking-deposit`). This could fail silently in newer Supabase versions.

**Fix**: Replace `getClaims` with `getUser` pattern.

---

### Moderate Issues

**4. `zura-pay-payouts` has no org-membership verification**
The function authenticates the user but never verifies they belong to the requested `organization_id`. Any authenticated user could request payouts for any org by passing an arbitrary ID. Other payment functions (`charge-card-on-file`) check `employee_profiles` membership.

**Fix**: Add org-membership check via `employee_profiles` lookup.

---

**5. Several more edge functions may have short CORS headers**
`collect-booking-deposit`, `create-terminal-payment-intent`, `terminal-reader-display`, `manage-stripe-terminals`, and `terminal-hardware-order` should be audited for the same CORS header gap.

**Fix**: Audit and standardize CORS headers across all Zura Pay edge functions.

---

**6. Missing `config.toml` for supporting billing functions**
`org-billing-portal`, `org-payment-info`, and `customer-portal` are also missing entries. These support the subscription/billing side but are invoked alongside Zura Pay.

**Fix**: Add entries to `config.toml`.

---

### Already Passing

| Area | Status |
|---|---|
| Secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`) | Configured |
| Stripe SDK version consistency (`v18.5.0` / `2025-08-27.basil`) | Consistent |
| Stripe webhook signature verification | Implemented |
| Idempotency keys on charges | Implemented |
| Brand isolation (no "Stripe" in UI) | Clean |
| Multi-tenant scoping (org-level Connect accounts) | Correct |
| Payment Ops UI (tabs, cross-links, empty states) | Complete |
| Configurator (onboarding, fleet, hardware, display) | Complete |
| Service worker offline caching | Active |

---

## Implementation Plan

### Step 1: Add missing `config.toml` entries
Add 10 function blocks to `supabase/config.toml`.

### Step 2: Fix `zura-pay-payouts` auth + security
- Replace `getClaims` with `getUser`
- Add org-membership check

### Step 3: Standardize CORS headers
Audit and update CORS headers in `charge-card-on-file`, `collect-booking-deposit`, `create-terminal-payment-intent`, `terminal-reader-display`, `manage-stripe-terminals`, `terminal-hardware-order` to include the full `x-supabase-client-*` header set.

| File | Action |
|---|---|
| `supabase/config.toml` | Add 10 missing function entries |
| `supabase/functions/zura-pay-payouts/index.ts` | Fix auth + add membership check |
| `supabase/functions/charge-card-on-file/index.ts` | Fix CORS headers |
| `supabase/functions/collect-booking-deposit/index.ts` | Audit + fix CORS |
| `supabase/functions/create-terminal-payment-intent/index.ts` | Audit + fix CORS |
| `supabase/functions/terminal-reader-display/index.ts` | Audit + fix CORS |
| `supabase/functions/manage-stripe-terminals/index.ts` | Audit + fix CORS |
| `supabase/functions/terminal-hardware-order/index.ts` | Audit + fix CORS |

No migrations. No UI changes. No new dependencies.

