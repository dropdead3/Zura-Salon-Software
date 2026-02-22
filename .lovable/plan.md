

# Appointment Detail Panel -- Gap Analysis (Round 4)

## Summary

After reviewing all 1,207 lines of `AppointmentDetailSheet.tsx` and 850 lines of `Schedule.tsx`, the previous rounds of fixes have resolved the majority of critical issues. This round identifies **2 remaining bugs**, **3 data/UX polish gaps**, and **2 structural concerns**.

---

## A. Status Change Sends `NO_SHOW` Instead of `no_show`

**Severity: Critical (actively broken)**

From the network logs, the edge function `update-phorest-appointment` received `"status":"NO_SHOW"` and returned a 400 error: `"Failed to update appointment locally"`. The panel's `handleStatusChange` passes lowercase `no_show` (correct), but the `updateStatus` mutation in the `usePhorestCalendar` hook may be transforming or uppercasing it before sending to the edge function. This means **No Show marking is completely broken** right now.

**Fix:** Investigate the `updateStatus` mutation in `usePhorestCalendar` to find where the status is being uppercased (likely `.toUpperCase()` or an enum mapping). Ensure `no_show` is sent as-is, or the edge function is updated to accept the uppercase variant.

### B. `confirmActionBarCancel` Note Insert Has Incorrect Promise Chain

**Severity: Medium**

In `Schedule.tsx` lines 459-468, the code wraps the Supabase call in `Promise.resolve(...)` which doesn't actually chain the inner promise correctly. `Promise.resolve(supabase...insert(...))` resolves with the Supabase query builder object, not its result. The `.catch()` will never fire on a failed insert because the error is swallowed inside the Supabase response object.

**Fix:** Remove the `Promise.resolve()` wrapper. Instead, use:
```
supabase.from('appointment_notes').insert({...}).then(({ error }) => {
  if (error) toast.warning('Cancellation reason could not be saved');
});
```

---

## C. No Loading Skeleton on Panel Open

**Severity: Low-Medium**

When the panel opens, the header renders immediately but sections like Client Contact (email), Location, and History all load asynchronously. There's no skeleton -- sections just appear empty then pop in. The header's "Last visit" line and "View Profile" button also pop in after `visitHistory` and `clientRecord` load.

**Fix:** Add a simple loading skeleton in the header area (name placeholder, service placeholder) and in the Details tab's Client Contact section while `clientRecord` is loading. Use the existing `Skeleton` component.

### D. Mobile Panel Not Optimized

**Severity: Low-Medium**

The panel uses `w-[calc(100vw-2rem)] max-w-[440px]` (line 479). On mobile (< 480px), the panel occupies nearly the full screen with small margins and rounded corners that waste space. The footer buttons wrap awkwardly on narrow screens.

**Fix:** Import `useIsMobile` hook. On mobile, apply `right-0 top-0 bottom-0 w-full max-w-none rounded-none` to the panel container, and add `flex-col` to the footer button container so buttons stack vertically.

### E. Note Textarea and Assistant Picker State Not Reset on Appointment Change

**Severity: Low**

When switching between appointments while the panel is open, the `newNote`, `newClientNote`, `showAssistantPicker`, and `isPrivateNote` states persist from the previous appointment. If a user was mid-way through typing a note for one client, switching to another appointment keeps that partial note visible.

**Fix:** Add a `useEffect` keyed on `appointment?.id` that resets `newNote`, `newClientNote`, `isPrivateNote`, `isPrivateClientNote`, `showAssistantPicker` to their defaults.

### F. `handleNotes` Action Bar Button Only Opens Panel, Doesn't Navigate to Notes Tab

**Severity: Low**

The `handleNotes` handler in `Schedule.tsx` (line 477-481) opens the detail panel but doesn't set the active tab to "notes". The user lands on the Details tab and must manually click Notes.

**Fix:** Add a mechanism to open the panel with a specific tab. Either pass an `initialTab` prop to `AppointmentDetailSheet`, or set a state variable that the panel reads on open.

---

## Priority

| # | Gap | Severity | Effort |
|---|---|---|---|
| A | NO_SHOW status uppercase bug | Critical | Low |
| B | Promise chain incorrect for cancel note | Medium | Low |
| F | Notes button doesn't navigate to Notes tab | Low | Low |
| E | Note/picker state not reset on appointment change | Low | Low |
| C | No loading skeleton | Low | Medium |
| D | Mobile panel not optimized | Low | High |

## Recommended Approach

Address A, B, E, and F in a single pass (all low effort). C and D follow as a polish pass.

### Technical Details

**A -- NO_SHOW Status Fix:**
- Read `usePhorestCalendar` to find the `updateStatus` mutation
- Locate where status is being uppercased or mapped
- Ensure `no_show` passes through correctly to the edge function, or update the edge function to handle `NO_SHOW` -> `no_show` mapping

**B -- Promise Chain Fix:**
- Replace lines 459-468 in `Schedule.tsx`:
```typescript
supabase
  .from('appointment_notes')
  .insert({
    phorest_appointment_id: selectedAppointment.phorest_id || selectedAppointment.id,
    author_id: user.id,
    note: noteText,
    is_private: false,
  })
  .then(({ error }) => {
    if (error) toast.warning('Cancellation reason could not be saved');
  });
```

**E -- Reset States on Appointment Change:**
- Extend the existing `useEffect` at line 171-173 in `AppointmentDetailSheet.tsx` to also reset `newNote`, `newClientNote`, `isPrivateNote`, `isPrivateClientNote`, `showAssistantPicker`

**F -- Notes Tab Navigation:**
- Add optional `initialTab` prop to `AppointmentDetailSheet`
- In `Schedule.tsx` `handleNotes`, set `setDetailOpen(true)` and pass `initialTab="notes"`
- In `AppointmentDetailSheet`, when `initialTab` changes and panel opens, set `activeTab` to `initialTab`

