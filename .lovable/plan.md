

# Appointment Detail Panel -- Full Gap Analysis

## Summary

After thorough review of the 1,128-line `AppointmentDetailSheet.tsx` and its integration in `Schedule.tsx`, I found **3 critical bugs**, **4 data completeness gaps**, **5 UX polish issues**, and **3 action flow gaps**.

---

## Critical Bugs

### 1. "View Profile" Button is a Dead End
The `onOpenClientProfile` dispatches a `CustomEvent('open-client-profile')` in `Schedule.tsx`, but **no listener exists anywhere in the codebase** to receive it. The `ClientDetailSheet` component is only rendered in `ClientDirectory.tsx`, not in `Schedule.tsx`. Clicking "View Profile" closes the appointment panel and does nothing.

**Fix:** Import `ClientDetailSheet` into `Schedule.tsx`, add state for the selected client, and wire the event listener (or replace the custom event pattern with direct state management).

### 2. Status Change from Detail Panel Uses Wrong ID
The `onStatusChange` prop passes `appointment.phorest_id` (line 356/366), but `Schedule.tsx` receives it as `(_, status) => handleStatusChange(status)` (line 603) -- it ignores the first argument and uses `selectedAppointment.id` instead. If `phorest_id` and `id` ever differ, the panel's status change will silently use the wrong identifier. This is fragile coupling.

**Fix:** Align the status change contract -- either always use `appointment.id` in the panel, or consume the passed ID in Schedule.

### 3. Cancel from Action Bar Skips Reason Dialog
`ScheduleActionBar`'s Cancel button calls `handleRemove` (line 414-418) which directly calls `handleStatusChange('cancelled')` and shows a toast -- **completely bypassing** the cancellation reason dialog that the detail panel enforces. This means cancellations triggered from the bottom bar have no reason captured.

**Fix:** Route the action bar cancel through the same confirmation dialog flow, or open the detail panel's cancel dialog.

---

## Data Completeness Gaps

### 4. No "Last Visit" Date in Header
The header shows client name and service summary but no quick indicator of when they were last seen. This is high-value context for the stylist -- knowing "last visited 3 weeks ago" vs. "6 months ago" changes the interaction entirely.

**Fix:** Derive last visit date from `visitHistory[0]?.appointment_date` and show as a subtle line under the service summary (e.g., "Last visit: Mar 2").

### 5. No Service Price Per-Line in Services Breakdown
The services card shows individual service names, categories, and durations but **no per-service price**. Only the total is shown. Operators need per-line pricing for transparency when discussing services with clients.

**Fix:** Join `phorest_services` price data via the service lookup to display per-service pricing where available.

### 6. History Tab Missing Average Visit Frequency
The History tab shows visit count, total spend, and tenure, but **no average visit frequency** (e.g., "every 5.2 weeks"). This is a core retention metric that operators use to assess client health.

**Fix:** Calculate from visit dates: `tenure / visitCount` and display as a 4th KPI tile or inline stat.

### 7. No "Walk-In" Indicator
If `phorest_client_id` is null (walk-in client), the panel still renders with missing data across all tabs but doesn't clearly indicate this is a walk-in. The "View Profile" button just won't appear, but there's no positive indicator.

**Fix:** Show a "Walk-In" badge next to the client name when `phorest_client_id` is null, and collapse the History/Client Notes sections to reduce noise.

---

## UX Polish Gaps

### 8. No Mobile Responsiveness
The panel uses `w-[calc(100vw-2rem)] max-w-[440px]` which works on desktop but on mobile (< 480px) the panel occupies nearly the full screen with tiny margins. No swipe-to-close, no adjusted padding, and the footer action bar buttons wrap awkwardly.

**Fix:** On mobile viewports, go full-width (`right-0 top-0 bottom-0 rounded-none`), reduce padding, stack footer actions vertically, and consider swipe-to-close via `framer-motion` drag gesture.

### 9. No Loading Skeleton on Panel Open
When the panel opens, all data hooks fire simultaneously. There is no skeleton or loading state for the main content -- the panel shows empty sections that pop in as data loads. The location name, client record, and linked redos all load asynchronously.

**Fix:** Add a brief skeleton state in the header and details tab while primary queries are loading.

### 10. Tab State Not Reset on Appointment Change
When selecting a different appointment while the panel is open, the tab state (`defaultValue="details"`) is only set on mount. If you're on the "Notes" tab and click a different appointment, you stay on Notes instead of resetting to Details.

**Fix:** Use `key={appointment?.id}` on the `Tabs` component to force re-mount on appointment change, or use controlled tab state that resets.

### 11. Booking Notes Duplicated Across Tabs
`appointment.notes` (POS Booking Notes) is rendered identically in **both** the Details tab (lines 797-805) and the Notes tab (lines 1003-1012). This is redundant and creates confusion about where the canonical location for notes is.

**Fix:** Remove POS Booking Notes from the Details tab; keep only in the Notes tab where it belongs contextually.

### 12. Copy Buttons Have No Visual Feedback
The copy-to-clipboard buttons for phone and email show toast notifications but the button itself has no visual state change (no checkmark animation, no color change). Premium panels typically show inline confirmation.

**Fix:** Add a brief check icon swap animation on the copy button after click (icon changes from Copy to Check for 1.5 seconds).

---

## Action Flow Gaps

### 13. No "Mark as Confirmed" in Footer
The footer action bar shows Check In, Pay, Reschedule, Rebook, and Cancel. But for `booked` status appointments, there is no "Confirm" button in the footer -- the user must use the status dropdown in the header. This is the most common status transition and should be one-tap accessible.

**Fix:** Add a "Confirm" button to the footer when `availableTransitions.includes('confirmed')`.

### 14. No "No Show" in Footer
Similarly, "No Show" is only accessible via the status dropdown. For front-desk operators doing end-of-day reconciliation, marking no-shows should be a prominent action, not buried in a dropdown.

**Fix:** Add a "No Show" button (with destructive styling) to the footer when `availableTransitions.includes('no_show')`.

### 15. Rebook Doesn't Pre-Fill Client
The `onRebook` handler in Schedule.tsx (line 605-608) only passes `date` and `stylistId` to the booking popover defaults. It does **not** pre-fill the client name or services. The operator has to re-select the client manually, defeating the purpose of a "rebook" action.

**Fix:** Extend `bookingDefaults` to include `clientId`, `clientName`, and `selectedServices` from the appointment, and wire these through to `QuickBookingPopover`'s initial data.

---

## Priority Matrix

| # | Issue | Severity | Effort |
|---|---|---|---|
| 1 | View Profile dead end | Critical | Medium |
| 2 | Status change ID mismatch | Critical | Low |
| 3 | Action bar cancel skips reason | Critical | Low |
| 10 | Tab state not reset | High | Low |
| 13 | No Confirm in footer | High | Low |
| 15 | Rebook no client pre-fill | High | Medium |
| 11 | Duplicate booking notes | Medium | Low |
| 4 | No last visit date | Medium | Low |
| 14 | No Show not in footer | Medium | Low |
| 6 | No visit frequency KPI | Medium | Low |
| 7 | No walk-in indicator | Medium | Low |
| 12 | Copy button feedback | Low | Low |
| 5 | No per-service price | Low | Medium |
| 8 | Mobile responsiveness | Low | High |
| 9 | Loading skeleton | Low | Medium |

## Recommended Approach

Address items 1-4, 10-11, 13-15 as a single pass (all in `AppointmentDetailSheet.tsx` and `Schedule.tsx`). These are high-impact, low-to-medium effort fixes that resolve all critical bugs and the most visible UX gaps. Items 5, 8, 9 can follow as a polish pass.

