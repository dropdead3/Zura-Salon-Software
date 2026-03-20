

## Add Assistant Selection to Booking Confirmation Step

### Problem
When creating a new booking in the Dock, there's no way to attach an assistant to the appointment. Assistants need to be linked at booking time so they can see and work on the appointment in the Dock app.

### Solution
Add an "Assistant" section to the `ConfirmStepDock` component (below the Stylist detail row), allowing the user to optionally select one or more team members as assistants. After booking, insert records into the existing `appointment_assistants` table.

### Changes

**File: `src/components/dock/schedule/DockNewBookingSheet.tsx`**

1. **Add state for selected assistants** (~line 84): `const [selectedAssistants, setSelectedAssistants] = useState<string[]>([])` — stores user_ids of chosen assistants.

2. **Fetch location team members** (~line 134): Add a query to fetch `employee_profiles` for the current location (same pattern used in `DockDeviceSwitcher`), filtering out the logged-in staff member (the stylist). Returns `{ userId, name, photoUrl }[]`.

3. **Pass assistants data to `ConfirmStepDock`** (~line 346): Pass `selectedAssistants`, `onAssistantsChange`, and `teamMembers` list as props.

4. **Render assistant picker in `ConfirmStepDock`** (after the Details card, ~line 888): Add an "Assistant (optional)" section with tappable chips for each available team member. Selected assistants get a violet highlight + checkmark. Styled consistently with the time slot chips.

5. **Insert `appointment_assistants` rows after booking** (~line 207): After the `create-phorest-booking` call succeeds, loop through `selectedAssistants` and insert into `appointment_assistants` with `appointment_id`, `assistant_user_id`, and `organization_id`.

6. **Reset assistant state on close** (~line 237): Add `setSelectedAssistants([])` to `handleClose`.

### UI Layout (Confirm Step)
```text
┌──────────────────────────────────┐
│ Eric Day · 14805430240           │
├──────────────────────────────────┤
│ Location: North Mesa             │
│ Stylist:  Demo Mode              │
│ Date:     Fri, Mar 20            │
│ Duration: 450m                   │
├──────────────────────────────────┤
│ ASSISTANT (OPTIONAL)             │
│ [Alexis R.] [✓ Kylie M.] [Sam]  │  ← tappable multi-select chips
├──────────────────────────────────┤
│ TIME                             │
│ [8:00] [8:30] [●9:00] ...       │
│ SERVICES                         │
│ Full Balayage · Merm · Specialty │
│ Estimated Total          $475    │
│ [     Confirm Booking      ]     │
└──────────────────────────────────┘
```

### Demo Mode
In demo mode, the team member query already works (same pattern as `DockDeviceSwitcher`). The `appointment_assistants` insert will be skipped (same as the booking mutation is a no-op in demo).

