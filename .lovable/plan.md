

## Fix Tips Drilldown: Show Tips by Staff Even Without User Mapping

### Root Cause

The `$551` in total tips is real — the parent card sums `tip_amount` from all `phorest_appointments` regardless of staff identity. But the drilldown groups by `stylist_user_id`, and **100% of tip-bearing appointments have `stylist_user_id = NULL`** because the `phorest_staff_mapping` table only contains 2 entries (both for a single user), while ~10 different `phorest_staff_id` values have tips.

The drilldown's line `if (apt.stylist_user_id)` skips every row, producing empty `byStylist` and `byTotalTips` arrays, which triggers the "No tip data recorded" empty state.

### Plan

**1. Fetch staff names from `phorest_staff_mapping`** — `useTipsDrilldown.ts`

Add a query to `phorest_staff_mapping` (which has `phorest_staff_id` → `phorest_staff_name` + `user_id`). This gives name resolution for any staff ID, even when `stylist_user_id` is null on the appointment.

**2. Use `phorest_staff_id` as fallback grouping key** — `useTipsDrilldown.ts`

Change the stylist aggregation logic:
- Primary key: `stylist_user_id` (when available)
- Fallback key: `phorest_staff_id` prefixed with `phorest:` to distinguish from UUIDs
- Name resolution: `employee_profiles` for mapped users, `phorest_staff_mapping.phorest_staff_name` for unmapped, `"Staff Member"` as last resort

Concretely, replace the `if (apt.stylist_user_id)` guard (line 156) with:

```typescript
const staffKey = apt.stylist_user_id || (apt.phorest_staff_id ? `phorest:${apt.phorest_staff_id}` : null);
if (staffKey) {
  // ...aggregate into stylistMap using staffKey
}
```

**3. Resolve names from both sources** — `useTipsDrilldown.ts`

Build a combined name map:
- From `employee_profiles`: `user_id` → `{ name, photo }`
- From `phorest_staff_mapping`: `phorest:${phorest_staff_id}` → `{ name: phorest_staff_name, photo: null }`

When building the `byStylist` and `byTotalTips` arrays, look up names using the combined map.

**4. No changes needed in `TipsDrilldownPanel.tsx`**

The panel already renders whatever `byTotalTips` contains. Once the hook populates it, the UI will show the data.

### Technical Details

**File: `src/hooks/useTipsDrilldown.ts`**

- Add a new query for `phorest_staff_mapping` (select `phorest_staff_id, phorest_staff_name, user_id`)
- Build a `staffNameMap` that maps `phorest:${phorest_staff_id}` → name, and also maps any `user_id` from the mapping into the `profileMap`
- Change line 156 from `if (apt.stylist_user_id)` to use the fallback key logic above
- Update the `byStylist` and `byTotalTips` array builders to resolve names from the combined map
- Appointments where both `stylist_user_id` and `phorest_staff_id` are null remain excluded (these shouldn't exist in practice)

### What Changes for the User

| Before | After |
|---|---|
| "$551 total tips" at top, "No tip data" below | **Tips by Stylist** section shows all 10+ staff members who earned tips |
| Staff names unavailable for unmapped IDs | Shows `phorest_staff_name` from mapping, or "Staff Member" as fallback |
| Avg Rate Ranking also empty | Populated for staff with 10+ appointments (several qualify) |

### Scope

~25 lines changed in 1 file (`useTipsDrilldown.ts`). One additional lightweight query added.

