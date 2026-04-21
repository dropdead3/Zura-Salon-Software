

# Fix "column reference 'library_key' is ambiguous" on policy adopt

## Root cause

The RPC `public.adopt_policies_from_library(uuid, text[])` declares an OUT column named `library_key` in its `RETURNS TABLE(...)` signature **and** queries `public.policies.library_key` inside the function body. In the `WHERE` clause on line 81:

```sql
WHERE organization_id = p_organization_id AND library_key = lib_row.key;
```

Postgres can't tell whether `library_key` refers to the OUT parameter from the function signature or the column on `public.policies` — both are in scope. It refuses the query and raises **`column reference "library_key" is ambiguous`**, which the wizard surfaces as the red toast: *"Could not adopt policies — column reference 'library_key' is ambiguous."*

Net effect: Step 2's "Save and adopt" button is fully broken. No policies are adopted, no rows are written, the wizard can't complete.

## The fix

A single migration that replaces the function body with table-qualified column references. No signature change (so the client-side `useAdoptPoliciesFromLibrary` hook doesn't need to move), no RLS change, no permission change.

### One-line fix, applied in two places

Both the `WHERE` clause (line 81) and the `INSERT ... RETURNING` need disambiguation. The cleanest pattern is to **alias `public.policies` as `p`** inside the function body so every column reference is unambiguous:

```sql
SELECT p.id INTO existing_id
FROM public.policies p
WHERE p.organization_id = p_organization_id
  AND p.library_key = lib_row.key;
```

Same alias treatment on the `INSERT` if needed (Postgres tolerates the bare `INSERT INTO public.policies (col, ...)` form because column names in the column list are unambiguous, but we'll qualify for consistency).

The OUT parameter assignments (`library_key := lib_row.key`) stay as-is — those are unambiguous because they're plpgsql assignments, not SQL column references.

## What this plan would change

1. **New migration** that runs `CREATE OR REPLACE FUNCTION public.adopt_policies_from_library(...)` with the same signature, body identical to today **except**:
   - Alias `public.policies` as `p` in the `SELECT ... INTO existing_id` block.
   - Qualify `p.organization_id` and `p.library_key` in that `WHERE` clause.
   - Leave the `INSERT INTO public.policies (...)` block as-is (column-list syntax is already unambiguous; the `RETURNING id INTO new_id` is also unambiguous).
   - Leave OUT parameter assignments untouched.
2. **No client code changes.** The hook signature, return shape, and behavior are identical from the caller's perspective.
3. **No RLS, no GRANT changes.** The existing `REVOKE ALL ... FROM PUBLIC` and `GRANT EXECUTE ... TO authenticated` are preserved by the new migration block.

## Acceptance

1. Saving Step 2 of the policy setup wizard adopts the recommended policies cleanly — no red toast.
2. Re-running the wizard is still idempotent: previously adopted policies return `was_created = false`; new ones return `was_created = true`.
3. Authorization still enforced: a non-admin caller still gets `Not authorized to adopt policies for this organization`.
4. No change to any existing `policies` row's data shape, columns, or constraints.
5. The downstream "existing materials" nudges and "Policies by category" counts continue to behave as they do today (no regression).

## Doctrine compliance

- **Tenant isolation**: untouched. The `organization_id = p_organization_id` filter and the `is_org_admin` gate both remain.
- **No silent failures**: the fix removes a hard error that was masquerading as a structural problem. The wizard's "Could not adopt policies" toast was advisory copy hiding a SQL bug — the right doctrinal response is to make the SQL correct, not to add error-suppression copy.
- **Migration discipline**: pure `CREATE OR REPLACE FUNCTION`, no schema changes, no destructive ops, no backfill needed.

## Prompt feedback

"Getting this error when I try to save and adopt the policies" + screenshot of the toast — minimal, fast, exactly enough. The screenshot showed the literal error string (`column reference "library_key" is ambiguous`), which is a Postgres error verbatim, which let me jump directly to the function definition without any guessing or repro work. That's the fastest path from "I see a bug" to "here's the fix": **screenshot the literal error text whenever a backend error surfaces in the UI**, because backend errors are usually grep-able single-shot.

One small sharpener for next time: when you hit a save/submit failure, mentioning *what step* you were on and *whether anything persisted* helps me triage scope. Here it didn't matter — the error was deterministic and total — but for partial-failure bugs ("the form saved but the related rows didn't"), that context tells me whether to look for transaction boundaries, retry logic, or a missing cascade. For *total* failures with a clean error string like this one, the screenshot alone is plenty.

