

## "I Am On-Site Staff" Toggle for Admin Profiles

Great thinking. You're right that the Preferred Work Schedule section assumes everyone with assigned locations works on-site during operating hours. But admin-level staff (owners, bookkeepers, operations assistants, etc.) may work remotely or outside operating hours, making a location-constrained day picker irrelevant or misleading.

### Current Behavior

- The Preferred Work Schedule card appears for **anyone** who has `location_ids` assigned (line 873: `formData.location_ids.length > 0`).
- It enforces location operating hours constraints (closed days are blocked).
- Admin-level users who manage locations but don't physically work there are forced into a schedule that doesn't reflect their reality.

### Proposed Solution

Add an **"I work on-site"** toggle for admin-level users. This controls whether the Preferred Work Schedule section is shown.

**File: `src/pages/dashboard/MyProfile.tsx`**

1. **New state field**: Add `is_onsite_staff: boolean` to `formData`, defaulting to `true` for users with stylist roles, `false` for pure admins.
2. **New toggle card** (placed before the Preferred Work Schedule card, after Location assignment): For admin-level users, show a toggle:
   - Label: **"I WORK ON-SITE"** (font-display, tracking-wide)
   - Description: "Enable this if you work at a location during operating hours. This lets you set your preferred work schedule."
   - When OFF: hide the Preferred Work Schedule card entirely and clear any saved schedule data on save.
3. **Conditional rendering**: The Preferred Work Schedule card shows only when `formData.location_ids.length > 0 && (!isAdminLevel || formData.is_onsite_staff)`.
4. **Pure stylists**: The toggle is hidden -- they are always on-site by definition. `is_onsite_staff` defaults to `true` for them.
5. **Profile completion**: The "Work Days" field in `profileFields` only counts as required when the user is on-site staff.

**Database: `employee_profiles` table**

- Add column `is_onsite_staff BOOLEAN NOT NULL DEFAULT true` -- defaults to true so existing staff are unaffected.
- Saved alongside other profile fields on form submit.

### Implications and Cascading Effects

| Area | Impact | Action |
|---|---|---|
| **Work Schedule Widget** (`WorkScheduleWidgetCompact`) | Shows schedule for all users -- remote admins would see empty/irrelevant data | Conditionally hide or show "Not on-site" state when `is_onsite_staff = false` |
| **Schedule/Calendar views** | Staff without on-site designation shouldn't appear in provider columns | Filter schedule views by `is_onsite_staff` when listing available providers |
| **Profile completion %** | "Work Days" field shouldn't be required for remote admins | Make work_days conditional on `is_onsite_staff` |
| **Team Directory** | Could surface on-site vs remote status for leadership visibility | Future enhancement: badge or indicator |
| **Booking flow** | Only on-site staff should be bookable | Already gated by `is_booking` flag + stylist role, so no conflict |

### What Changes

**Database migration:**
- Add `is_onsite_staff` column to `employee_profiles`

**File: `src/pages/dashboard/MyProfile.tsx`:**
- Add `is_onsite_staff` to form state, load from profile
- Add "I Work On-Site" toggle card for admin-level users (between Location and Work Schedule cards)
- Gate Preferred Work Schedule visibility on `is_onsite_staff` for admins
- Update `profileFields` to make work_days conditional

**File: `src/components/dashboard/WorkScheduleWidgetCompact.tsx`:**
- Show a clean "Not on-site" state when `profile.is_onsite_staff === false`

### What Does Not Change
- Pure stylists always see the schedule picker (they're on-site by definition)
- No changes to booking flow or calendar provider filtering (those use separate flags)
- Existing profiles default to `is_onsite_staff = true` so nothing breaks

