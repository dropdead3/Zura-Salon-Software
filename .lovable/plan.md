

## Add Client Deselect Option

### Change

**`src/components/dock/schedule/DockNewBookingSheet.tsx`**

1. **Add `onDeselectClient` prop** to `ClientStepDock` — a callback that sets `selectedClient` to `null` and clears selected services.

2. **Add an X button** to the selected client banner (the violet card at the top, lines 569–584). Place a small `X` icon button on the right side of the banner that calls `onDeselectClient`.

3. **Wire it up** in the parent: pass `onDeselectClient={() => { setSelectedClient(null); setSelectedServices([]); }}` to `ClientStepDock`.

This lets the user tap the X on the selected client card to deselect and pick a different client. Services are also cleared since they may be client-specific.

