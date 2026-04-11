

# Bug & Gap Audit — Capital Engine, Vertical Integration, Stylist SPI/ORS, Financing Layer

## Findings

### P0 — Critical Bugs

**1. `compute-stylist-spi` edge function uses service-role client for auth validation (line 25)**
The function creates a service-role client, then uses it to call `auth.getUser(token)`. This works but defeats JWT verification intent — the service-role key bypasses RLS. More critically, if `SUPABASE_SERVICE_ROLE_KEY` is missing, auth silently fails. Should use a separate anon client for auth validation (like `create-financing-checkout` does correctly).

**2. `aggregate-product-performance` upsert uses `onConflict: "id"` (line 117)**
The `id` column is a random UUID generated on insert. This means the upsert will NEVER match an existing row — every invocation creates duplicate rows instead of updating. Needs a composite unique index on `(organization_id, product_id, service_name, period_start, period_end)` and the upsert must target that.

**3. `evaluate-replenishment` edge function has no auth check**
No JWT validation, no caller verification. Any request with a valid `organization_id` can trigger replenishment events. Needs at minimum a service-role or admin-level auth check.

**4. `aggregate-product-performance` edge function has no auth check**
Same issue — completely unauthenticated. Anyone can trigger aggregation for any org.

### P1 — High Priority Gaps

**5. `evaluate-replenishment` CORS headers incomplete**
Missing `x-supabase-client-platform*` and `x-supabase-client-runtime*` headers that modern Supabase JS clients send. Will fail with CORS errors from the frontend.

**6. `aggregate-product-performance` CORS headers incomplete**
Same issue — missing the extended CORS headers.

**7. `FinancedProjectsTracker` always shows "Financed Project" as title (line 63)**
The component never joins with the expansion opportunity to get the actual title. Every financed project shows the same generic text. Should join `expansion_opportunities.title` in the query.

**8. `SupplyChainDashboard` hardcodes empty `supplierName` and `isPreferredSupplier: false` (lines 53-54)**
The `ProductPerformanceInput` objects are built from `product_service_performance` data but the supplier name and preferred status are never joined from actual supplier data. All products appear as non-preferred with empty supplier names, making the recommendation engine's preferred-supplier scoring meaningless.

**9. `stylist_spi_scores` and `stylist_career_milestones` missing INSERT RLS policies**
The edge function uses service-role to write, which is correct. But there are no INSERT policies at all — if any client-side code ever tries to write (e.g., admin manually adjusting), it will be blocked. Not critical since writes go through the edge function, but inconsistent with the other tables.

**10. `useFinancedProjects` hook inserts ledger entries with `as any` cast (line 62)**
The `recorded_at` field has a DEFAULT but the cast hides any type mismatch. Minor, but should be cleaned up.

### P2 — Important Follow-ups

**11. `FundThisDialog` opens Stripe URL in new tab but doesn't handle popup blockers**
`window.open()` can return `null` if blocked. Should fall back to `window.location.href` assignment.

**12. `create-financing-checkout` doesn't check for duplicate financed projects**
If a user clicks "Fund This" twice rapidly, two `financed_projects` rows get created for the same opportunity. Should check for existing `pending_payment` rows before inserting.

**13. `financing-webhook` doesn't verify the webhook secret is actually set**
If `STRIPE_FINANCING_WEBHOOK_SECRET` is empty, it falls through to parsing raw JSON (dev mode). In production this is a security hole — any POST with valid JSON would be accepted.

**14. `product_service_performance` has no `service_role` INSERT/UPDATE policies**
The `aggregate-product-performance` edge function uses service-role which bypasses RLS, so this works. But the table has zero write policies, meaning admin UI can never manually adjust data.

**15. `ReplenishmentQueue` displays raw `product_id` (UUID) instead of product name (line 68)**
Users see UUIDs instead of human-readable product names.

## Fix Plan

### Migration (1 migration)
- Add composite unique index on `product_service_performance(organization_id, product_id, service_name, period_start, period_end)`
- No other schema changes needed

### Edge Function Fixes
- `compute-stylist-spi`: Create separate anon client for auth, use service client for data writes
- `evaluate-replenishment`: Add auth validation + extended CORS headers
- `aggregate-product-performance`: Add auth validation + extended CORS headers; fix upsert to use composite unique constraint
- `financing-webhook`: Add warning log when webhook secret is missing in production

### Hook/Component Fixes
- `useFinancedProjects`: Join `expansion_opportunities(title)` in the query
- `FinancedProjectsTracker`: Display actual opportunity title
- `SupplyChainDashboard`: Join supplier data with product performance to populate `supplierName` and `isPreferredSupplier`
- `ReplenishmentQueue`: Join product name from `products` table
- `FundThisDialog`: Add popup-blocker fallback
- `create-financing-checkout` edge function: Add duplicate check for pending_payment rows

### Build Order
1. DB migration (composite unique index)
2. Fix all 3 edge functions (auth + CORS + upsert)
3. Fix `useFinancedProjects` query join
4. Fix `FinancedProjectsTracker` to show title
5. Fix `SupplyChainDashboard` supplier data binding
6. Fix `ReplenishmentQueue` product name display
7. Fix `FundThisDialog` popup fallback + duplicate guard

