

## Prompt review

Direct and accurate — the screenshot shows exactly what's broken. Teaching note: naming the surface ("QuickBookingPopover") or how you opened it ("clicked an empty time slot on the calendar") would have skipped a discovery step. I confirmed in code that the previous fix only touched `BookingWizard`, but the surface in the screenshot is `QuickBookingPopover` — a separate component with its own step machine. That's why the modal still appears.

## Diagnosis

There are **two booking surfaces** on the schedule page:

1. `BookingWizard` (the "+ New Booking" toolbar button) — already consolidated last round.
2. `QuickBookingPopover` (clicking a time slot on the calendar) — **still uses the stacked `NewClientDialog`**. This is the surface in the screenshot.

`QuickBookingPopover` (`src/components/dashboard/schedule/QuickBookingPopover.tsx`) has:
- Step machine: `'service' | 'location' | 'client' | 'stylist' | 'confirm'`
- `[showNewClientDialog, setShowNewClientDialog]` state (line 269)
- Three call sites that open the dialog: lines ~1152, ~1256, and an empty-state link
- A `<NewClientDialog>` rendered at the bottom (line ~2409) inside a stacked `<Dialog>` on top of the popover panel — exactly the layered overlay seen in the screenshot.

The same `NewClientStep` component built last round is reusable here — it's drawer-shaped, no `Dialog` wrapper, sticky footer, viewport-aware popovers.

## Fix

Single-file change in `QuickBookingPopover.tsx`. Reuse `NewClientStep` already in `src/components/dashboard/schedule/booking/NewClientStep.tsx`. No new components.

1. **Extend the step type** to include `'newClient'`:
   ```ts
   type Step = 'service' | 'location' | 'client' | 'newClient' | 'stylist' | 'confirm';
   ```
   Keep `STEPS` array unchanged (`'newClient'` is a sub-step of `'client'`, doesn't appear in the progress bar). The step-bar render loop already iterates `STEPS`, so the bar stays at 5 segments.

2. **Replace all three `setShowNewClientDialog(true)` call sites** with `setStep('newClient')`. Remove the `showNewClientDialog` state and the standalone `<NewClientDialog>` JSX block at the bottom.

3. **Render `<NewClientStep />` when `step === 'newClient'`** inside the same panel body, alongside the other step views. Wire:
   - `defaultLocationId={selectedLocation}`
   - `onCancel={() => setStep('client')}`
   - `onCreated={(client) => { setSelectedClient({ ...client, preferred_stylist_id: null }); setStep('stylist'); }}` (mirrors the dialog's previous post-creation handler at line ~2418, but advances forward in the flow rather than just closing).

4. **Back-button handling**: extend the existing back-navigation switch to handle `step === 'newClient'` → `setStep('client')`.

5. **Step indicator / clickable progress dots**: the step bar maps over `STEPS`; since `'newClient'` is not in `STEPS`, treat the active highlight as `'client'` when on `'newClient'`. One-line conditional in the render.

6. **Header/title**: if there's a step-title helper, return `'Add New Client'` for `'newClient'`. If the title is computed inline, add the conditional next to where it lives.

## Out of scope

- `NewBookingSheet.tsx` continues to use `NewClientDialog` (separate flow, not what the user is hitting). Same dialog file remains in the codebase for that surface.
- No changes to `NewClientStep.tsx` itself — it already works in `BookingWizard`.

## Acceptance checks

1. Schedule → click an empty time slot → QuickBookingPopover opens → reach Client step → click "Add new client" (icon button or empty-state link) → panel transitions to embedded "Add New Client" view in the same drawer (no second modal).
2. All form fields work (search-enabled Preferred Stylist, location-scoped default, scrolling fixes carry over since it's the same component).
3. Cancel returns to the client list with prior search preserved.
4. Successful Create Client selects the new client and advances to the Stylist step.
5. Step progress bar still shows 5 segments and highlights "Client" while on the embedded new-client view.
6. Back button on the embedded step returns to the client list.
7. `NewBookingSheet` (different surface) still opens its standalone `NewClientDialog`.
8. `BookingWizard` flow (already consolidated last round) continues to work.

## Files to touch

- **Modify** `src/components/dashboard/schedule/QuickBookingPopover.tsx`
  - Add `'newClient'` to `Step` type
  - Remove `showNewClientDialog` state and the bottom `<NewClientDialog>` block
  - Replace 3 `setShowNewClientDialog(true)` call sites with `setStep('newClient')`
  - Render `<NewClientStep />` in the step body
  - Extend back-navigation and (if needed) title helper
  - Import `NewClientStep` from `./booking/NewClientStep`
- **Untouched**: `NewClientStep.tsx`, `NewClientDialog.tsx`, `NewBookingSheet.tsx`, `BookingWizard.tsx`.

## Further enhancement suggestions

- Once both wizards are converted, deprecate the embedded `NewClientDialog` in `NewBookingSheet` next so all booking surfaces have the same single-drawer behavior.
- Move the shared step-machine pattern (`'newClient'` as a sub-step of `'client'`) into a small helper hook to prevent the next surface from drifting back into stacked dialogs.
- Add a one-line E2E/Playwright check: "open quick booking → add new client → confirm no second overlay in DOM" — would have caught this regression instantly.

