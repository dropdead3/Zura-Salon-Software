

## Prompt review

Sharp request — "consolidate into the drawer" is exactly the right framing because it names the *outcome* (one continuous flow) rather than the implementation. Teaching note: also calling out scope (e.g. "only for the booking wizard, leave QuickBookingPopover and NewBookingSheet alone for now") would lock the blast radius. I'll assume that limited scope and flag the other two surfaces as out of scope.

## Diagnosis

Today, `BookingWizard.tsx` opens `NewClientDialog` as a separate stacked `Dialog` on top of the `PremiumFloatingPanel` drawer. That creates:

- Two overlays competing for focus and z-index (the cause of the recent popover bugs).
- A jarring context switch — the user leaves the drawer, fills a modal, gets returned.
- Duplicated chrome (header, close button, footer) that doesn't match the rest of the wizard.

The same `NewClientDialog` is also used by `QuickBookingPopover` and `NewBookingSheet` — those must keep working.

## Fix

### 1. Extract a reusable in-flow form
Create `src/components/dashboard/schedule/booking/NewClientStep.tsx` containing the entire form body of the existing dialog (fields, gender chips, location, email/phone, birthday, client since, preferred stylist combobox, notes, duplicate detection hook + modal, create mutation).

- Same props as the dialog's behavior, minus dialog open state:
  - `defaultLocationId?: string`
  - `onCreated(client): void`
  - `onCancel(): void`
- Layout matches the wizard's other steps (`flex flex-col h-full`, scrollable middle, sticky footer with Cancel + Create Client buttons, no `Dialog`/`DialogContent` wrapper).
- Keep `DuplicateDetectionModal` (it's a true secondary confirmation, fine to remain a small modal).

### 2. Wire it into the wizard as a real step
In `BookingWizard.tsx`:

- Extend `BookingStep` to `'service' | 'client' | 'newClient' | 'stylist' | 'confirm'`.
- Replace `setShowNewClientDialog(true)` in the `ClientStep` `onNewClient` callback with `setStep('newClient')`.
- Render `<NewClientStep />` when `step === 'newClient'` inside the same drawer body.
- On created → set selected client and advance to `'stylist'` (matches today's post-creation flow, which currently goes back to `'service'` — that was a bug-ish behavior; verify with user via outcome, but logical next step after picking client is stylist).
- On cancel → go back to `'client'`.
- Remove the standalone `<NewClientDialog>` instance from the wizard's JSX.
- Update `BookingHeader`'s `STEPS` array to include `'newClient'` so the progress bar stays accurate (or treat `'newClient'` as a sub-step of `'client'` and keep the bar at the client position — leaning toward sub-step to avoid lengthening the progress bar).

### 3. Header/title for the embedded step
- `getStepTitle()` returns `'Add New Client'` when `step === 'newClient'`.
- Subtitle: `'Create a client to continue'`.
- Back button on the header returns to `'client'`.

### 4. Out of scope (keep dialog working there)
- `QuickBookingPopover.tsx` and `NewBookingSheet.tsx` continue to use `NewClientDialog` as-is. The dialog stays in the codebase. We're only changing the wizard's flow.

## Acceptance checks

1. Open Schedule → New Booking → reach Client step → click "Add new client" → drawer transitions to an embedded "Add New Client" view (no second modal opens).
2. The form contains all fields from the previous dialog (name, gender, location, email/phone, birthday, client since, preferred stylist combobox with search + location filter, notes).
3. Preferred Stylist combobox opens above the drawer with no z-index issues and scrolls cleanly (already-fixed behavior carries over).
4. Cancel returns to the client list with prior search preserved.
5. Successful Create Client selects the new client and advances to the Stylist step.
6. Duplicate detection modal still appears on conflict; "Create anyway" / "Open existing" / "Start merge" all behave as before.
7. Header back button on the new step returns to the client list.
8. `QuickBookingPopover` and `NewBookingSheet` flows still open the standalone `NewClientDialog` correctly (no regression).

## Files to touch

- **Create** `src/components/dashboard/schedule/booking/NewClientStep.tsx` — extracted form, no Dialog wrapper, sticky footer.
- **Modify** `src/components/dashboard/schedule/booking/BookingWizard.tsx` — add `'newClient'` step, render `NewClientStep`, drop the embedded `<NewClientDialog>`, route success → `'stylist'`, cancel → `'client'`.
- **Modify** `src/components/dashboard/schedule/booking/BookingHeader.tsx` — title handling for new step (or leave progress bar alone if treated as client sub-step).
- **Untouched** `NewClientDialog.tsx`, `QuickBookingPopover.tsx`, `NewBookingSheet.tsx`.

## Further enhancement suggestions

- Once the embedded version is proven, migrate `NewBookingSheet` to use the same `NewClientStep` for consistency.
- Add a subtle "Created — adding to booking" toast inline at the top of the Stylist step so the handoff feels intentional.
- Consider collapsing the Birthday + Client Since row on narrow drawer widths to single-column for breathing room.

