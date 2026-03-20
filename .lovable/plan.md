

## Show Assistant Names + Add Team Member Toggle in Demo Mode

### Problem
1. Appointments only show stylist name (e.g., "Jamie") but not assigned assistants
2. In demo mode, there's no way to switch between team members if one has no appointments today

### Changes

**1. Add `assistant_names` to `DockAppointment` interface and fetch them in `useDockAppointments.ts`**
- Add `assistant_names?: string[]` field to the interface
- In the org-specific demo path: after fetching appointments, batch-query `appointment_assistants` for all appointment IDs, resolve names via `employee_profiles`, and attach them
- In the normal (non-demo) path: same batch query pattern
- In faux data: add sample assistant names to `DEMO_APPOINTMENTS`

**2. Display assistant names on `DockAppointmentCard.tsx`**
- Below the stylist name row, render assistant names with a `Users` icon (e.g., "w/ Alexis, Kylie")
- Subtle styling matching the existing stylist name row

**3. Add Team Member toggle to `DockDeviceSwitcher.tsx`**
- Only visible in demo mode (`usesRealData`)
- A `<select>` dropdown (styled like the location picker) with a `User` icon, placed to the right of the location selector
- Fetches team members from `employee_profiles` filtered by `organization_id` (via the org's locations)
- Default: "All" (current behavior — show all appointments for the location)
- Selecting a specific stylist filters appointments by `stylist_user_id`

**4. Wire the stylist filter through the component chain**
- Add `staffFilter` state in `Dock.tsx`, pass through `DockLayout` → `DockScheduleTab` → `useDockAppointments`
- `useDockAppointments`: when `staffFilter` is set (and not "all"), add `.eq('stylist_user_id', staffFilter)` to the query
- Pass `onStaffFilterChange` callback to `DockDeviceSwitcher`

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/dock/useDockAppointments.ts` | Add `assistant_names` field, fetch from `appointment_assistants` + profiles; accept optional `staffFilter` param |
| `src/hooks/dock/dockDemoData.ts` | Add `assistant_names` to faux appointments |
| `src/components/dock/schedule/DockAppointmentCard.tsx` | Render assistant names below stylist |
| `src/components/dock/DockDeviceSwitcher.tsx` | Add team member dropdown (demo mode only) |
| `src/pages/Dock.tsx` | Add `staffFilter` state, pass through props |
| `src/components/dock/DockLayout.tsx` | Thread `staffFilter` + `onStaffFilterChange` props |
| `src/components/dock/schedule/DockScheduleTab.tsx` | Pass `staffFilter` to hook |

