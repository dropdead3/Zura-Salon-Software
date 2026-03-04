

## Admin Meeting Scheduler & Support Staff Shift Scheduling

### Your Prompt -- What Works Well

Your instinct on the role-based branching is exactly right: admin-only users default to "Schedule A Meeting," while dual-role users (admin + service provider) get a type selector first. The conflict-aware scheduling for meetings with service providers is a high-value feature that leverages existing infrastructure.

**One refinement:** Rather than building this as a modification to the existing `QuickBookingPopover` (which is deeply specialized for salon service bookings -- 2,400+ lines, service categories, add-ons, redo policies), this should be a **parallel wizard** that shares conflict-checking and availability infrastructure but has its own UI flow. Merging admin meetings into the salon booking flow would create complexity that violates the platform's persona-scaling principle.

### Suggested Scope Split (Two Distinct Features)

**Feature A: Admin Meeting Scheduler** -- Scheduling internal meetings (1-on-1s, interviews, manager meetings)

**Feature B: Support Staff Shift Scheduler** -- Shift planning for non-service roles (front desk, receptionist, support)

These are architecturally different: meetings are event-based (like appointments), while shifts are time-range-based (like schedules). Building them together risks a muddled UX. I'd recommend Feature A first since it extends the existing schedule infrastructure directly.

---

### Feature A: Admin Meeting Scheduler -- Detailed Plan

#### Data Model

New `admin_meetings` table (not reusing `appointments` -- different entity semantics):

```text
admin_meetings
├── id (uuid, PK)
├── organization_id (uuid, FK)
├── location_id (text, nullable) -- physical location
├── organizer_user_id (uuid, FK) -- the admin scheduling
├── title (text) -- "1-on-1 with Sarah", "Interview: John Doe"
├── meeting_type (enum: one_on_one, interview, manager_meeting, training, other)
├── start_date (date)
├── start_time (time)
├── end_time (time)
├── duration_minutes (int)
├── meeting_mode (enum: in_person, video, hybrid)
├── video_link (text, nullable) -- Zoom/Teams URL
├── notes (text, nullable)
├── status (enum: scheduled, cancelled, completed)
├── created_at, updated_at
└── RLS: org-scoped via is_org_member

admin_meeting_attendees
├── id (uuid, PK)
├── meeting_id (uuid, FK → admin_meetings)
├── user_id (uuid) -- staff member invited
├── rsvp_status (enum: pending, accepted, declined)
├── notified_at (timestamp, nullable)
└── RLS: org-scoped via meeting join
```

#### Wizard Flow: "Schedule A Meeting"

```text
Step 1: Meeting Type
  ┌─────────────────────────────┐
  │ 1-on-1  │ Interview │ Team  │
  │ Meeting │           │ Mtg   │
  └─────────────────────────────┘

Step 2: Attendees (multi-select staff)
  - Search/filter by role, location
  - Shows availability indicators

Step 3: Date & Time
  - Calendar picker
  - Conflict-aware slot recommendations
  - Cross-checks attendee appointments + existing meetings
  - "Best available times" ranked list

Step 4: Location / Mode
  - In-Person (select location/room)
  - Video Call (paste Zoom/Teams link or generate)
  - Hybrid (both)

Step 5: Confirm & Send Invites
  - Summary card
  - Send in-app notification + optional email invite
```

#### Role-Based Entry Point

In `QuickBookingPopover` or the schedule toolbar:

- **Admin-only user** → Opens "Schedule A Meeting" wizard directly
- **Admin + Service Provider** → Shows type selector first:

```text
┌──────────────────────────────────┐
│ What would you like to schedule? │
│                                  │
│  [📅 Client Appointment]        │
│  [🤝 Internal Meeting]          │
└──────────────────────────────────┘
```

#### Conflict Detection

Reuses existing infrastructure:
- Query `phorest_appointments` + `appointments` for service provider conflicts
- Query `admin_meetings` + `admin_meeting_attendees` for meeting conflicts
- Surface conflicts inline: "Sarah has a client at 2:00 PM -- next available: 2:45 PM"

#### Meeting Invites

- In-app notification via existing notification system
- Email invite via transactional email (service communication flow pattern)
- RSVP tracking in `admin_meeting_attendees`

#### Schedule Visualization

Admin meetings render on the existing schedule grid as a distinct card type:
- Different accent color (e.g., indigo/blue vs. service category colors)
- Meeting icon instead of scissors
- Shows attendee count badge

---

### Feature B: Support Staff Shift Scheduler (Phase 2)

This is a separate planning surface -- not calendar events but **recurring time blocks**:

```text
staff_shifts
├── id, organization_id, location_id
├── user_id (the support staff member)
├── shift_date (date)
├── start_time, end_time
├── role_context (enum: front_desk, receptionist, coordinator, other)
├── status (enum: scheduled, swapped, cancelled)
├── is_recurring, recurrence_pattern
└── RLS: org-scoped
```

This would integrate with the existing `shift_swaps` system already in your codebase and surface as a dedicated "Staff Shifts" view accessible from the schedule page or admin settings.

---

### Recommended Phasing

| Phase | Scope | Effort |
|-------|-------|--------|
| **Phase 1** | Admin Meeting Scheduler -- data model, wizard, conflict detection, schedule rendering | Large |
| **Phase 2** | Meeting invites (in-app + email), RSVP tracking | Medium |
| **Phase 3** | Support staff shift scheduling, recurring shifts, shift swap integration | Large |

---

### Enhancement Suggestions Beyond Your Prompt

1. **Meeting templates** -- Save recurring meeting configs (e.g., "Weekly 1-on-1 with Sarah, Tuesdays 10 AM")
2. **Availability overlay** -- When selecting attendees, show a mini day-view with their booked slots grayed out
3. **Auto-suggest optimal times** -- "All 3 attendees are free Tuesday 2-3 PM and Thursday 10-11 AM"
4. **Meeting notes / action items** -- Post-meeting, attach notes that link to the task system
5. **Interview pipeline** -- For new-hire interviews, track candidate flow (scheduled → completed → hired/passed)

### Implementation Recommendation

I'd suggest starting with **Phase 1** -- the core meeting scheduler with conflict detection. Want me to build that?

