

## Appointment Detail Panel Enhancements

### Overview
Four enhancements to the Appointment Detail Panel to improve client context, note management, new-client visibility, and stylist reassignment.

---

### 1. Client Notes in Details Tab (Collapsible, Capped)

Move a **read-only summary** of client notes into the **Details tab**, below the Client Contact section. This gives stylists immediate context without switching to the Notes tab.

- Uses a `Collapsible` component showing the **3 most recent** client notes by default
- If more than 3 notes exist, a "Show all X notes" trigger expands the rest inside a `ScrollArea` capped at `max-h-48` (192px) to prevent the section from dominating the panel
- Notes remain **read-only** in the Details tab -- adding/deleting stays in the Notes tab
- Each note shows: author avatar, author name, date, private icon if applicable, and the note text (truncated to 2 lines with `line-clamp-2`)
- Empty state: "No client notes" muted text
- Hidden for walk-in appointments (consistent with existing pattern)

### 2. Appointment Notes Preview in Details Tab

Similarly, show the **2 most recent** appointment notes as a compact preview in the Details tab, below the client notes summary.

- Compact rendering: avatar + author + date + note text (line-clamp-2)
- "View all in Notes tab" link at the bottom if more exist, which switches `activeTab` to `'notes'`
- Keeps the Details tab as the single-glance view while Notes tab remains the full CRUD interface

### 3. New Client Indicator Enhancement

The `is_new_client` flag already exists and renders a green "New" badge in the status row. Enhancement:

- If the client has **zero completed visits** in their history (determined from `visitStats.visitCount === 0`), render an additional subtle callout banner in the Details tab:
  ```
  [Star icon] First-time client -- no prior service history on file.
  ```
  - Styled as a soft emerald info banner (similar to linked-redo banner style)
  - Only shown for non-walk-in appointments with a linked client
  - This catches cases where `is_new_client` might not be set but the client genuinely has no history

### 4. Reassign to Another Stylist

Add a **"Reassign Stylist"** action to the ellipsis menu, available to managers/admins/primary owners.

- Clicking opens a `Dialog` with a team member picker (reusing the existing `teamMembers` data from `useTeamDirectory`)
- Shows each stylist's avatar, name, and conflict status for that time slot (reusing `useAssistantConflictCheck` pattern)
- On selection, updates the appointment's `stylist_user_id` (and `phorest_staff_id` via staff mapping lookup) and fires an audit log entry
- Updates both `phorest_appointments` and `appointments` tables based on `_source`
- Invalidates calendar queries on success
- Permission-gated: only `isManagerOrAdmin` can see and use this action

---

### Technical Details

**File modified:** `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`

**Changes by section:**

1. **Details Tab -- Client Notes Summary** (after Client Contact section, ~line 1206):
   - Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from UI
   - Render top 3 client notes in compact format
   - Collapsible "Show all" with ScrollArea max-h-48

2. **Details Tab -- Appointment Notes Preview** (after client notes summary):
   - Render top 2 appointment notes in compact format
   - "View all" button that calls `setActiveTab('notes')`

3. **Details Tab -- First-time Client Banner** (after linked redos, ~line 969):
   - Conditional on `!isWalkIn && visitStats.visitCount === 0 && !!appointment.phorest_client_id`
   - Emerald info banner with Star icon

4. **Ellipsis Menu -- Reassign Stylist** (~line 818):
   - New `DropdownMenuItem` gated on `isManagerOrAdmin`
   - New `showReassignDialog` state + `Dialog` component
   - Team member list with conflict indicators
   - Mutation to update stylist assignment + audit log

5. **New State Variables:**
   - `showReassignDialog: boolean`
   - `selectedNewStylist: string | null`

6. **New Mutation** for reassignment:
   - Updates `stylist_user_id` and `staff_name` on the appropriate table
   - Looks up `phorest_staff_id` from `phorest_staff_mapping` for phorest appointments
   - Fires audit event with old/new stylist info

