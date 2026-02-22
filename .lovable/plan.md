

# Appointment Detail Panel -- Remaining Gaps Analysis (Round 3)

## Summary

After reviewing the full 1,204-line `AppointmentDetailSheet.tsx` and 831-line `Schedule.tsx` post-implementation, the previous 15-item fix pass landed well. This analysis covers residual gaps that remain or were introduced.

---

## Remaining Gaps

### A. Rebook Still Does NOT Pre-Fill Client (Fix #15 Incomplete)

The `onRebook` handler in `Schedule.tsx` (lines 674-686) sets `bookingDefaults` with `date` and `stylistId`, but the `initialDraftData` prop on `QuickBookingPopover` (line 725) is only populated when `activeDraft` is truthy. Since rebook sets `activeDraft` to `null` (line 678), the booking popover opens with no client pre-fill. The `setTimeout` block on lines 682-685 is a no-op placeholder comment.

**Fix:** Add a `rebookData` state variable. When `onRebook` fires, populate it with the appointment's client ID, client name, and services. Pass it as `initialDraftData` to `QuickBookingPopover` when `rebookData` is set. Clear it when the popover closes.

### B. Per-Service Price Not Rendering

The services breakdown card (line 293) attempts to read `price` via `(serviceLookup?.get(name) as any)?.price`, but `useServiceLookup` (line 192, defined in `useServiceLookup.ts`) only selects `name, category, duration_minutes` -- it never fetches `price`. The `price` field is always `null`.

**Fix:** Update `useServiceLookup.ts` to also select `price` from `phorest_services`, add `price` to the `ServiceLookupEntry` interface, and render it in the services breakdown (line 677-681 area).

### C. Loading Skeleton Missing on Panel Open

When the panel opens, the header and all tabs render immediately with empty/missing data while `clientRecord`, `locationName`, `visitHistory`, and `linkedRedos` queries load. There is no skeleton placeholder -- sections just appear empty then pop in.

**Fix:** Add a brief loading skeleton state in the header area (avatar placeholder, name skeleton, status skeleton) and in the Details tab (info rows) that shows while `clientRecord` is loading.

### D. Mobile Panel Not Optimized

The panel uses `right-4 top-4 bottom-4 w-[calc(100vw-2rem)] max-w-[440px]` (line 479). On mobile (< 480px), this means tiny 16px margins with no rounded-none adjustment. The footer action buttons wrap awkwardly on small screens.

**Fix:** Add responsive classes: on mobile viewports, switch to `right-0 top-0 bottom-0 w-full max-w-none rounded-none` and stack footer buttons vertically. Use `useIsMobile()` hook already imported in Schedule.tsx (pass as prop or use directly).

### E. `confirmActionBarCancel` Note Insert Has No Error Handling

In `Schedule.tsx` (lines 448-459), the note insertion uses `.then(() => {})` with no `.catch()`. If the insert fails (e.g., RLS issue), the cancellation still proceeds but the reason is silently lost.

**Fix:** Add a `.catch()` that logs/toasts a warning ("Cancellation reason could not be saved") so operators know the note was lost.

### F. Action Bar "Undo" Button Has No Handler

`ScheduleActionBar` renders an "Undo" button (line 65-72 of `ScheduleActionBar.tsx`) with `onClick={onUndo}`, but `Schedule.tsx` never passes an `onUndo` prop. The button renders but does nothing when clicked.

**Fix:** Either implement an undo stack (track last status change, allow reverting) or hide the Undo button until an undo capability exists.

### G. `formatDate` Used Incorrectly for Last Visit

Line 512 calls `formatDate(parseISO(lastVisitDate), 'MMM d')` but `useFormatDate` may not accept a format string as the second argument depending on its implementation. If it wraps `date-fns/format` differently, this could silently fail or show unexpected output.

**Fix:** Verify `useFormatDate` signature; if it doesn't accept custom format strings, use `format` from `date-fns` directly instead.

### H. Stagger Animations Re-trigger on Every Tab Switch

Each tab's `motion.div` uses `initial="hidden" animate="show"`, which means every time you switch back to a tab, all items re-animate from opacity 0 + translateY. This feels janky on repeated tab switches.

**Fix:** Use `initial={false}` after the first render, or wrap in `AnimatePresence mode="wait"` with `key={activeTab}` so animations only play on tab entry, not re-entry.

---

## Priority

| # | Gap | Severity | Effort |
|---|---|---|---|
| A | Rebook no client pre-fill (incomplete) | High | Medium |
| B | Per-service price never renders | Medium | Low |
| E | Silent note insert failure | Medium | Low |
| F | Undo button dead | Medium | Low |
| C | No loading skeleton | Low | Medium |
| G | formatDate signature risk | Low | Low |
| H | Stagger re-trigger on tab switch | Low | Low |
| D | Mobile panel optimization | Low | High |

## Recommended Approach

Address A, B, E, F, G, H in a single pass (all low-to-medium effort). C and D can follow as a polish pass.

### Technical Details

**A -- Rebook Pre-Fill:**
- Add state: `const [rebookData, setRebookData] = useState<{...} | null>(null)`
- In `onRebook`: populate with `clientId`, `clientName`, `staffUserId`, `staffName`, `selectedServices` from the appointment
- Pass `initialDraftData={activeDraft ? ... : rebookData ? rebookData : undefined}` to `QuickBookingPopover`
- Clear `rebookData` when popover closes

**B -- Per-Service Price:**
- In `useServiceLookup.ts`: add `price` to the select query and `ServiceLookupEntry` interface
- In `AppointmentDetailSheet.tsx` line 677-681: render `svc.price` when available (wrapped in `BlurredAmount`)

**E -- Error Handling:**
- Add `.catch(() => toast.warning('Cancellation reason could not be saved'))` to the supabase insert chain

**F -- Undo Button:**
- Hide the Undo button by not rendering it when `onUndo` is undefined (add conditional in `ScheduleActionBar.tsx`)

**G -- formatDate:**
- Replace `formatDate(parseISO(lastVisitDate), 'MMM d')` with `format(parseISO(lastVisitDate), 'MMM d')` using date-fns directly

**H -- Stagger Re-trigger:**
- Change `initial="hidden"` to `initial={false}` on tab content `motion.div` containers, and only use `initial="hidden"` on first mount via a ref flag

