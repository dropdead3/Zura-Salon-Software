

## Hide Flask Icon on Completed Appointment Cards

**Problem:** The flask icon appears on all cards with a mix session, including completed ones. Once an appointment is completed, the mix session is finished too — the icon adds visual noise without actionable value.

**File:** `src/components/dock/schedule/DockAppointmentCard.tsx` — line 148

**Change:** Add a status check so the flask icon only renders for non-terminal appointments:

```tsx
// Before
{appointment.has_mix_session && (

// After
{appointment.has_mix_session && !['completed', 'cancelled', 'no_show'].includes((appointment.status || '').toLowerCase()) && (
```

Single condition addition, one line. Flask icon will still appear on Active and Scheduled cards where it's meaningful.

