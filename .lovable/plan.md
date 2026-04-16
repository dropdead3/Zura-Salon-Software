
## Prompt review

Sharp prompt. You arrived at a hypothesis ("is this pulling from Phorest?") and grounded it in real-world context (Julia archived in Phorest, doesn't exist in Zura). That's exactly how to triage a stale-data bug. Teaching note: your hypothesis was *almost* right but slightly off — the actual issue is even more interesting. The data is correctly being pulled from Zura, but Julia DOES exist in Zura's `employee_profiles` (active, approved, North Mesa). So this isn't a Phorest-vs-Zura bug — it's a **role classification** bug. Even tighter prompt next time: "Julia is in the list — is she classified as a stylist somewhere she shouldn't be?"

## Diagnosis

Database confirms three facts:

1. **Julia exists in Zura** — `employee_profiles` has her as active, approved, North Mesa. Not a phantom Phorest record.
2. **Julia's role is `receptionist`** — not `stylist` or `stylist_assistant`. Our role filter SHOULD have excluded her.
3. **`v_all_staff` is a UNION** — pulls from `phorest_staff_mapping` (when she has one) AND from `employee_profiles`. Julia has a Phorest mapping (`JBIpYAt3DR85aHvHucHlcg`), so she appears via the Phorest branch with `show_on_calendar = true`.

So the data source isn't wrong. The role filter is being **bypassed** somewhere.

Looking at the popover: the role filter (`filterToStylistsAndDedupe`) is correctly applied to both `stylists` (location-scoped) and `allStylists` (all locations). Both queries should drop Julia.

But the screenshot shows **7 names including Julia** — same list size as before our role-filter change. That means one of three things:
- The query cache is stale and rendering pre-filter results
- A different code path is feeding the list (not `filteredStylists`)
- The role lookup itself is returning Julia because she has a *secondary* role we're not seeing

I just confirmed via `user_roles`: Julia ONLY has `receptionist`. No stylist role. So the filter should work — meaning the most likely cause is **the list isn't rendering from `filteredStylists`**. There's likely a fallback path (e.g. when `qualificationData` is empty, or when `selectedServices` is empty, the component falls back to raw `stylists` or `allStylists` instead of `uniqueStylists` / `filteredStylists`).

Need to inspect the actual render path (line ~1900–1950) to confirm which array feeds the visible list at this step.

## Fix

Single file: `src/components/dashboard/schedule/QuickBookingPopover.tsx`.

### A. Audit the render path
Find the JSX at the Available Stylists step and confirm it iterates `filteredStylists`, not `stylists` or `allStylists` directly. If any branch falls back to the raw arrays, route them through `uniqueStylists` / `uniqueAllStylists` (which are role-filtered upstream).

### B. Verify the role-filter is actually executing
Add a temporary `console.log` in `filterToStylistsAndDedupe` to confirm it runs and returns the expected filtered set. If the cached query is stale, invalidate `['booking-stylists', selectedLocation]` and `['booking-stylists-all']` so the next open re-runs the filter.

### C. Defense-in-depth at the database
Add a `v_calendar_stylists` view that pre-filters `v_all_staff` to only `stylist` + `stylist_assistant` roles via `user_roles`. Then point both queries at the new view. This kills the entire class of "forgot to filter roles in surface X" bugs forever — the data layer enforces it.

The view definition would join `v_all_staff` to `user_roles` and only emit rows where the user has at least one of the two allowed roles. This becomes the single source of truth for any booking surface.

### D. Cache invalidation
Once the filter works, the existing cached results for North Mesa may still be stale. Force a refetch by bumping the query key (e.g. add a version suffix `'v2'`) so old cache entries are abandoned.

## Acceptance checks

1. North Mesa Quick Booking → Available Stylists shows **5 names**: Alexis Heasley, Brooklyn Colvin, Cienna Ruthem, Samantha Bloom, Trinity Graves.
2. **Julia Gross is gone** — `receptionist` role correctly excluded.
3. **Eric Day is gone** — `super_admin` role correctly excluded.
4. Switch location → Switch back → still 5 names (no stale cache).
5. Stylist-first mode shows the same role-filtered list across all locations.
6. If a real `stylist_assistant` exists, they appear.

## Follow-up enhancements

- Build the `v_calendar_stylists` view as the canonical source. Every booking surface (popover, wizard, public booking) should query it instead of re-implementing role filters.
- Add a runtime assertion: if `Available Stylists` ever renders a user whose role isn't `stylist` or `stylist_assistant`, log a warning to the console. Catches drift the moment it happens.
- Audit `BookingWizard` and public booking surfaces for the same role-filter gap before users find them in production.
