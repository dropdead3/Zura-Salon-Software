

## Kebab Menu Actions on Dock Appointment Cards

### What We're Building

1. **3-dot kebab menu** on `DockAppointmentCard` with contextual actions:
   - "Complete Appointment" — marks appointment as `completed` via the existing `update-phorest-appointment` edge function
   - "View Client Profile" — navigates to a client quick-view (notes, history)

2. **Completion flow** — When "Complete" is tapped:
   - Calls `update-phorest-appointment` with `status: 'COMPLETED'`
   - This updates both `phorest_appointments` and `appointments` tables (existing dual-table resolution)
   - Invalidates `dock-appointments`, `phorest-appointments`, and `appointments` query caches so the scheduler reflects the completed status immediately
   - Logs an audit event (`status_changed`)
   - Triggers overage charge calculation (existing `useCalculateOverageCharge` hook fires on session completion — we invoke it for any completed mix sessions linked to this appointment)

3. **Overage charges surfacing to POS** — The `checkout_usage_charges` table already stores overage data per appointment. On completion:
   - Run the overage calculation for all mix sessions linked to the appointment (using existing `computeAndStoreCheckoutProjection` + charge insertion logic)
   - The POS/checkout views already query `checkout_usage_charges` by `appointment_id`, so charges appear automatically

### Files to Create/Modify

| File | Change |
|------|--------|
| `src/components/dock/schedule/DockAppointmentCard.tsx` | Replace static kebab icon with a Popover menu. Add "Complete Appointment" and "View Client" actions. Stop event propagation so the card tap still works. |
| `src/hooks/dock/useDockCompleteAppointment.ts` | **New hook** — wraps `update-phorest-appointment` call with `status: 'COMPLETED'`, triggers overage charge calculation for linked mix sessions, logs audit event, invalidates all relevant query caches |
| `src/components/dock/schedule/DockScheduleTab.tsx` | Pass a new `onComplete` callback and `onViewClient` callback through to `DockAppointmentCard` |
| `src/components/dock/appointment/DockClientQuickView.tsx` | **New component** — lightweight client profile sheet showing name, notes, visit history, last service. Fetched from `phorest_clients` / `clients` by `phorest_client_id` or `client_id` |
| `src/components/dock/DockLayout.tsx` | Wire the new callbacks from schedule tab through to the layout |

### Completion → Overage → POS Flow

```text
Dock Card "Complete" tap
  → useDockCompleteAppointment
    → invoke('update-phorest-appointment', { status: 'COMPLETED' })
    → fetch mix_sessions for this appointment
    → for each completed session: computeAndStoreCheckoutProjection()
    → insert checkout_usage_charges records
    → invalidate queries (dock-appointments, phorest-appointments, appointments)
    → log audit event
  → Scheduler sees status = 'completed' (cache invalidated)
  → POS queries checkout_usage_charges by appointment_id → overage charges visible
```

### UI Details

- **Popover menu** styled with `--platform-*` tokens (dark theme) to match Dock identity
- Menu items: icon + label, violet accent on hover
- "Complete" hidden when status is already terminal
- "View Client" opens a bottom sheet with client profile summary

