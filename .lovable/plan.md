

# Security Scan — Phase 5 Analysis

## Current Status

Down from **11 critical + 5 warnings** to **1 critical + 4 warnings + 2 info**. The previous 4 phases resolved the vast majority of issues.

---

## Remaining Findings

### CRITICAL — Fix Now

**1. Client payment card details readable by all salon staff**
- Table: `client_cards_on_file`
- Current policy: `is_org_member(auth.uid(), organization_id)` on SELECT — every stylist, assistant, receptionist can read `stripe_payment_method_id`, `stripe_customer_id`, `card_last4`, expiry
- Fix: Replace SELECT policy to restrict to admin, manager, receptionist, super_admin, primary_owner only

### WARNINGS — Recommended

**2. Leaked Password Protection disabled**
- Cannot be fixed via migration. You need to enable it manually: go to Lovable Cloud → Users → Auth Settings → Email → toggle "Password HIBP Check" on

**3. Extensions in public schema**
- `pg_trgm`, `unaccent`, etc. in public schema. Moving them risks breaking dependent functions. Acceptable risk — no action needed.

**4-5. Two `USING(true)` / `WITH CHECK(true)` policies on INSERT for public forms**
- `job_applications`: Public job application form — intentionally public INSERT, already has admin-only SELECT/UPDATE/DELETE
- `day_rate_bookings`: Public booking form — intentionally public INSERT, already has admin-only management policies
- These are legitimate public-facing forms. Should be marked as intentional/ignored.

### INFO

**6-7. RLS enabled but no policies on `employee_pins` and `demo_queries`**
- `employee_pins`: Correct by design — access is exclusively through SECURITY DEFINER RPCs (`validate_dock_pin`, `set_employee_pin`, etc.)
- `demo_queries`: Internal/dev table, no sensitive data

### NEW DISCOVERY — Cross-Org Data Leaks (not flagged by scanner)

Several tables with `USING(true)` SELECT for authenticated users lack `organization_id` columns, meaning **any authenticated user from any org can read all rows**:

**8. `ring_the_bell_entries`** — Contains service_booked, ticket_value. No org_id. Cross-org leakage.
**9. `shift_swaps` / `shift_swap_messages`** — Contains schedule data. No org_id, only `location_id`. Cross-org leakage.
**10. `staffing_history`** — Contains headcount data. Only `location_id`, no org_id. Cross-org leakage.
**11. `marketing_campaigns`** — Contains budget, spend data. Has `created_by` but no org_id. Cross-org leakage.
**12. `leaderboard_history` / `leaderboard_weights` / `leaderboard_achievements`** — Performance data. No org_id.
**13. `challenge_participants` / `challenge_progress_snapshots`** — No org_id.
**14. `user_responsibilities` / `user_achievements`** — No org_id.

These are architectural gaps — the tables were created without `organization_id` and would need schema changes + data backfill to fix properly.

---

## Implementation Plan

### Migration: Fix actionable items

**Step 1 — Restrict `client_cards_on_file` SELECT**
```sql
DROP POLICY "Org members can view cards" ON public.client_cards_on_file;
CREATE POLICY "Authorized staff can view cards"
  ON public.client_cards_on_file FOR SELECT TO authenticated
  USING (
    is_org_admin(auth.uid(), organization_id)
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('manager', 'receptionist')
    )
  );
```

**Step 2 — Add `organization_id` to cross-org tables (high-impact subset)**
Add `organization_id` column + backfill from related tables for the most sensitive ones:
- `ring_the_bell_entries` (via `enrollment_id` → program enrollments)
- `shift_swaps` (via `location_id` → locations)
- `staffing_history` (via `location_id` → locations)
- `marketing_campaigns` (via `created_by` → employee_profiles)

Then replace `USING(true)` with `USING(is_org_member(auth.uid(), organization_id))`.

**Step 3 — Update security findings**
Mark `job_applications` INSERT, `day_rate_bookings` INSERT, `employee_pins` no-policy, and `demo_queries` as intentional/ignored.

### Frontend changes
- None expected — queries already filter by org on the frontend

### Files affected
| Area | Change |
|------|--------|
| New migration SQL | Policy changes + schema additions |
| Security findings | Mark intentional items as ignored |

### Deferred items
- **Remaining tables without org_id** (leaderboard_*, challenge_*, user_achievements, user_responsibilities) — lower sensitivity, can be addressed in a future pass
- **Leaked Password Protection** — manual toggle in Cloud UI
- **Realtime authorization** — Supabase-reserved schema, application-layer enforcement only

