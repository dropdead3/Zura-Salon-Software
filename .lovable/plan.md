

## Enhancement Plan: Meeting Email Invites, Recurring Templates, Shift Scheduling, Availability Overlay, Auto-Suggest Times

This is a large scope covering 5 enhancements. I recommend building them in order of dependency and value.

---

### Enhancement 1: Email Invites for Meeting Attendees

**What:** When a meeting is created, send a branded transactional email to each attendee via the existing `sendOrgEmail` infrastructure.

**How:**
- Create edge function `send-meeting-invite/index.ts` that accepts a meeting ID, fetches meeting details + attendees + organizer profile, and sends a branded email via `sendOrgEmail`
- Call this edge function from `useCreateMeeting` after successful meeting creation
- Email includes: meeting title, type, date/time, location/video link, organizer name, and a deep link to the schedule page
- Uses `emailType: 'transactional'` to bypass marketing rate limits

| File | Change |
|------|--------|
| `supabase/functions/send-meeting-invite/index.ts` | New edge function using `sendOrgEmail` |
| `src/hooks/useAdminMeetings.ts` | Invoke edge function after meeting creation |

---

### Enhancement 2: Recurring Meeting Templates

**What:** Save meeting configurations as reusable templates. Users can create a meeting from a template with one click.

**How:**
- New `meeting_templates` table: `id, organization_id, created_by, name, meeting_type, title_template, duration_minutes, meeting_mode, location_id, video_link, attendee_user_ids (text[]), notes, is_active, created_at, updated_at` with org-scoped RLS
- New hook `useMeetingTemplates.ts` for CRUD
- Add "Save as Template" button on the confirm step of `MeetingSchedulerWizard`
- Add "From Template" option at the start of the wizard that pre-fills all fields
- Templates section in a popover/dropdown on the wizard's type step

| File | Change |
|------|--------|
| Migration | `meeting_templates` table with RLS |
| `src/hooks/useMeetingTemplates.ts` | New CRUD hook |
| `src/components/dashboard/schedule/meetings/MeetingSchedulerWizard.tsx` | Add template save + template picker UI |

---

### Enhancement 3: Support Staff Shift Scheduling (Phase 3)

**What:** Shift planning for non-service roles (front desk, receptionist, coordinator).

**How:**
- New `staff_shifts` table: `id, organization_id, location_id, user_id, shift_date, start_time, end_time, role_context (enum: front_desk, receptionist, coordinator, other), status (enum: scheduled, swapped, cancelled), is_recurring, recurrence_pattern (text), notes, created_by, created_at, updated_at` with org-scoped RLS
- New hook `useStaffShifts.ts` for CRUD + date-range queries
- New component `src/components/dashboard/schedule/shifts/ShiftScheduleView.tsx` -- a weekly grid showing shift blocks per staff member
- New component `ShiftEditorDialog.tsx` for creating/editing individual shifts
- Integrate into the Schedule page as a tab or toggle alongside Day/Agenda views
- Shift swap integration: link `staff_shifts` to existing `shift_swaps` table

| File | Change |
|------|--------|
| Migration | `staff_shifts` table with enum + RLS |
| `src/hooks/useStaffShifts.ts` | New hook |
| `src/components/dashboard/schedule/shifts/ShiftScheduleView.tsx` | Weekly grid UI |
| `src/components/dashboard/schedule/shifts/ShiftEditorDialog.tsx` | Create/edit dialog |
| `src/pages/dashboard/Schedule.tsx` | Add shifts tab/view toggle |

---

### Enhancement 4: Availability Overlay

**What:** When selecting attendees in the meeting wizard, show a mini day-view with each attendee's booked slots grayed out so the organizer can visually find open windows.

**How:**
- New component `AttendeeAvailabilityOverlay.tsx` rendering a horizontal timeline (7 AM–9 PM) per selected attendee
- Fetches appointments + meetings for each attendee on the selected date (reuses `useMeetingConflicts` data pattern)
- Renders occupied blocks as colored bars, free time as open space
- Placed between the calendar and time picker on the datetime step of the wizard
- Shows only when attendees are selected and a date is chosen

| File | Change |
|------|--------|
| `src/components/dashboard/schedule/meetings/AttendeeAvailabilityOverlay.tsx` | New component |
| `src/components/dashboard/schedule/meetings/MeetingSchedulerWizard.tsx` | Integrate overlay on datetime step |

---

### Enhancement 5: Auto-Suggest Optimal Times

**What:** Automatically find time slots where all selected attendees are free, ranked by preference (morning, early afternoon, etc.).

**How:**
- New hook `useOptimalMeetingTimes.ts` that takes attendee IDs, date, and duration, then:
  1. Fetches all appointments + meetings for those attendees on that date
  2. Builds a merged "busy" timeline per attendee
  3. Scans 15-min increments (7 AM–9 PM) to find slots where all attendees are free for the full duration
  4. Ranks by time-of-day preference and returns top 5
- Surface as "Suggested Times" chips above the time picker on the datetime step
- Clicking a chip auto-fills `startTime`

| File | Change |
|------|--------|
| `src/hooks/useOptimalMeetingTimes.ts` | New hook with availability algorithm |
| `src/components/dashboard/schedule/meetings/MeetingSchedulerWizard.tsx` | Render suggested time chips |

---

### Build Order

1. **Email invites** (standalone edge function, minimal UI change)
2. **Availability overlay** (improves wizard UX, no schema change)
3. **Auto-suggest optimal times** (builds on overlay's data pattern)
4. **Recurring templates** (new table + wizard UI additions)
5. **Staff shift scheduling** (largest scope, new table + full UI)

### Files Modified/Created Summary

| New Files | Count |
|-----------|-------|
| Edge function (`send-meeting-invite`) | 1 |
| Hooks (templates, shifts, optimal times) | 3 |
| Components (overlay, shift grid, shift editor) | 3 |
| Migrations (templates table, shifts table) | 2 |

| Modified Files | Count |
|----------------|-------|
| `MeetingSchedulerWizard.tsx` | 1 (templates + overlay + suggestions) |
| `useAdminMeetings.ts` | 1 (email invoke) |
| `Schedule.tsx` | 1 (shifts tab) |
| `meetings/index.ts` | 1 (exports) |

