

## Prompt review

Tight, observable bug report — "dropdown not opening" + screenshot of the exact field. Teaching note: adding what *does* happen on click (nothing, flicker, opens but blank, console error) speeds up the diagnosis. I'll proceed with what I confirmed in code.

## Diagnosis

The Preferred Stylist `Popover` is rendered **behind** the Dialog because of a z-index mismatch:

- `DialogContent` and `DialogOverlay` use `z-[70]` (`src/components/ui/dialog.tsx`)
- `PopoverContent` uses `z-50` (`src/components/ui/popover.tsx`)

Both portal to `document.body`. The popover panel ends up underneath the dialog's overlay, so the click never lands on a `CommandItem` and the popover appears non-functional. The trigger itself fires `setStylistPickerOpen(true)`, but the panel is invisible/non-interactive beneath the dialog.

The neighboring "Client Since" popover suffers the same theoretical issue but is less noticeable because the calendar can render in clear space; the stylist dropdown is wider and overlaps the dialog area.

## Fix

Single, surgical change in `NewClientDialog.tsx`:

- Add an explicit `z-[80]` (one tier above the dialog's `z-[70]`) to the Preferred Stylist `PopoverContent`.
- Apply the same fix to the "Client Since" `PopoverContent` to prevent the same latent bug.

No structural or logic changes. The combobox keeps:
- search input
- location-scoped default list
- "Show all stylists" escape hatch
- auto-clear on location change

## Acceptance checks

1. Open Add New Client → click Preferred Stylist → popover opens above the dialog.
2. Search input is focusable; typing filters results.
3. Selecting a stylist updates the trigger label with avatar + name and closes the popover.
4. Selecting "None" clears the value.
5. Client Since calendar still opens correctly.
6. No regressions to other popovers in the app (change is scoped to this file).

## Files to touch

- `src/components/dashboard/schedule/NewClientDialog.tsx`
  - Add `z-[80]` to the Preferred Stylist `PopoverContent` className.
  - Add `z-[80]` to the Client Since `PopoverContent` className.

## Further enhancement suggestions

- Promote the global `PopoverContent` z-index to `z-[80]` so any popover inside any dialog "just works" — would prevent this class of bug across the app.
- Add a Storybook/visual test for "popover-inside-dialog" to catch z-index regressions.
- Consider unifying dialog/popover/sheet z-index tokens in `design-tokens.ts` so layering is explicit instead of magic numbers.

