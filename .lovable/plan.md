

## Partial Service Reassignment + Gap Analysis

### Context

Currently, the appointment data model stores all services as a comma-separated `service_name` string with a single `stylist_user_id`. The "Reassign Stylist" action (just added) reassigns the entire appointment. There is no mechanism to assign individual services within a multi-service appointment to different stylists.

---

### 1. New Database Table: `appointment_service_assignments`

A new table to track per-service stylist overrides within an appointment:

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid (PK) | Row identity |
| `appointment_id` | uuid (FK) | Links to `phorest_appointments.id` |
| `service_name` | text | The specific service being reassigned |
| `assigned_user_id` | uuid | The stylist assigned to this service |
| `assigned_staff_name` | text | Display name snapshot |
| `organization_id` | uuid | Tenant scope |
| `created_at` | timestamptz | Auto |
| `created_by` | uuid | Who made the assignment |

- RLS: org-member read, org-admin write (matching existing patterns)
- Unique constraint on `(appointment_id, service_name)` -- one override per service
- When no row exists for a service, the appointment-level `stylist_user_id` is the default

---

### 2. Reassign Dialog Enhancement

The existing "Reassign Stylist" dialog gains a **mode toggle**:

```text
[ Entire Appointment ]  [ Individual Services ]
```

**Entire Appointment mode** (current behavior): Select one stylist, reassign all services.

**Individual Services mode** (new):
- Lists each service from the comma-separated `service_name`
- Each service row shows: service name, category badge, duration, and a stylist selector
- The stylist selector defaults to the appointment-level stylist (shows "Default" badge)
- Clicking a service row opens an inline picker (same team member list with conflict indicators)
- Conflict check is shared -- uses the same `useAssistantConflictCheck` data
- On save, inserts/upserts rows into `appointment_service_assignments`
- Fires audit log with `{ service, oldStylist, newStylist }` per change

---

### 3. Services Breakdown UI Update

In the Details tab, the "Services" section (lines 1070-1101) currently shows each service with name, category, duration, and price. Enhancement:

- If `appointment_service_assignments` data exists for any service, show the assigned stylist's avatar + name inline on that service row
- Services without overrides show nothing (inheriting the lead stylist)
- Visual indicator: small avatar (h-4 w-4) + name to the right of the service name

---

### 4. First-Time Client Banner Fix (Gap)

The first-time client banner added in the previous change uses `visitStats.visitCount === 0`. However, `visitStats` is computed from `visitHistory` which only loads when the History tab is active or the data is pre-fetched. If the user never opens History, this may not trigger correctly.

Fix: Ensure `visitHistory` query runs regardless of active tab (it already does based on the code -- the query is not tab-gated, so this is actually fine).

---

### 5. Additional Gaps and Enhancements Identified

**A. Client Notes Loading State**
The client notes preview in the Details tab references `clientNotesLoading` and `clientNotes` -- need to verify these variables exist in scope. The existing Notes tab uses `useAppointmentNotes` for appointment notes and a separate client notes query. The client notes query must be extracted to a shared variable if not already available.

**B. Reassign Audit Trail Visibility**
The reassign action fires an audit log, but there is no UI to view reassignment history. Enhancement: Add a "Reassignment History" line in the Details tab (under Stylist section) showing when and by whom the stylist was changed. This pulls from `appointment_audit_log` where `action = 'stylist_reassigned'`.

**C. Calendar Card Visual Indicator for Split-Staff Appointments**
When services are assigned to different stylists, the appointment card on the calendar should show a subtle indicator (e.g., a small "split" icon or multi-avatar stack) so managers can see at a glance which appointments have mixed staffing.

**D. Notification to Reassigned Stylist**
Currently, reassignment is silent. Future enhancement: trigger an in-app notification or chat message to both the original and new stylist when their appointment is reassigned.

---

### Technical Details

**Database migration:**
- Create `appointment_service_assignments` table with RLS policies
- Unique constraint on `(appointment_id, service_name)`

**Files modified:**

1. **`src/components/dashboard/schedule/AppointmentDetailSheet.tsx`**
   - Add new hook to fetch `appointment_service_assignments` for current appointment
   - Add mode toggle (Entire / Individual) to the Reassign Dialog
   - In Individual mode, render service list with per-service stylist pickers
   - New mutation for upserting service assignments
   - Update Services Breakdown to show per-service stylist avatars when overrides exist

2. **New hook: `src/hooks/useServiceAssignments.ts`**
   - Fetches service assignment overrides for a given appointment ID
   - Returns a `Map<serviceName, { userId, staffName }>` for easy lookup
   - Upsert mutation for saving individual assignments

3. **`src/components/dashboard/schedule/AppointmentCardContent.tsx`** (future)
   - Show split-staff indicator when service assignments exist for different stylists
