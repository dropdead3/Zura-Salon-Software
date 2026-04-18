
## Phase 2 — SECURITY DEFINER View Audit (Investigation Complete)

### What I found

The 6 ERROR-level views from the linter are all `v_all_*` union views supporting the Phorest decoupling architecture (`mem://architecture/phorest-decoupling-and-zura-native-operations`):

| View | Composition |
|---|---|
| `v_all_clients` | `phorest_clients ∪ clients` |
| `v_all_sales_transactions` | `transaction_items ∪ phorest_sales_transactions` |
| `v_all_services` | `services ∪ phorest_services` |
| `v_all_staff` | (Phorest staff ∪ Zura employee_profiles) |
| `v_all_staff_qualifications` | (Phorest qualifications ∪ Zura staff_qualifications) |
| `v_calendar_stylists` | calendar-facing stylist union |

They became implicit `SECURITY DEFINER` simply because they're owned by `postgres` and have no `security_invoker` reloption set. The 3 sibling views (`v_all_appointments`, `v_all_transaction_items`, `products_public`) already have `security_invoker = on` and pass the linter — so this is a missed flag, not an architectural decision.

### Why this is unsafe

These views UNION public tables with no aggregation. There's no platform-admin or cross-tenant intent. Today they bypass RLS on the underlying tables — meaning a frontend query authenticated as Org A could in theory read Org B's clients, sales, staff, services, or qualifications via these views.

### Verification underlying tables can carry the load

All 7 underlying tables (`phorest_clients`, `clients`, `transaction_items`, `phorest_sales_transactions`, `services`, `phorest_services`, `phorest_staff`, `staff_qualifications`, `employee_profiles`) have RLS enabled with 2–8 policies each. Flipping the views to INVOKER pushes enforcement to those existing org-scoped policies — no new policies needed.

### Frontend impact assessment

Views are read by 72 files (sales cards, calendar, scheduler, today-prep, booking availability). All those queries already run as authenticated org members against tables with `is_org_member(auth.uid(), organization_id)` policies — so flipping to INVOKER returns the same row set the user is already entitled to see. No UI breakage expected.

### Fix

Single migration that does, for each of the 6 views:

```sql
ALTER VIEW public.v_all_clients SET (security_invoker = true);
ALTER VIEW public.v_all_sales_transactions SET (security_invoker = true);
ALTER VIEW public.v_all_services SET (security_invoker = true);
ALTER VIEW public.v_all_staff SET (security_invoker = true);
ALTER VIEW public.v_all_staff_qualifications SET (security_invoker = true);
ALTER VIEW public.v_calendar_stylists SET (security_invoker = true);
```

No view definitions change — only the security mode flag.

### Verification after deploy

1. Re-run `supabase--linter` — confirm 0 ERROR-level definer warnings remain.
2. Smoke-test in preview: load `/dashboard/sales`, `/dashboard/schedule`, and `/dashboard/admin/team-hub` — confirm clients, sales chart, calendar stylists, and staff qualifications all still render.
3. Spot-check by querying `v_all_clients` via psql as a non-org user — confirm zero rows returned.

### Memory update

Append to `mem://security/multi-tenant-isolation-and-hardening`: "Union views (`v_all_*`) must declare `security_invoker = true` so RLS on underlying tables governs access. Owner-default DEFINER mode is prohibited for tenant-scoped views."

### Out of scope (this phase)

- The 7 RLS-no-policy tables and the WARN-level `USING(true)` policies — those belong to Phase 3.
- Any view definition rewrites — definitions are correct, only the security flag is wrong.

### Files

- **New migration**: `ALTER VIEW` x6 statements above.
- **Memory update**: `mem://security/multi-tenant-isolation-and-hardening` — add union-view rule.

Approve and I'll ship the migration, re-run the linter, then surface Phase 3's enumerated `USING(true)` policies for review.
