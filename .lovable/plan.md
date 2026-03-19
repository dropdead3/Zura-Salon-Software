

# FIFO Stock Rotation Reminder on Receiving

## What to Build

When a backroom manager confirms a shipment receive, show a FIFO (First In, First Out) reminder alert dialog before the actual submission. The dialog reminds them to:
- Pull all existing inventory forward on the shelf
- Place newly received inventory behind the older stock
- Check for any expired or near-expiry items while rotating

The user must acknowledge the reminder before the receive is processed.

## Implementation

### Edit: `src/components/dashboard/backroom-settings/inventory/ReceiveTab.tsx`

1. Add state: `showFifoReminder` (boolean) and `pendingReceiveData` (stores the mutation input temporarily)
2. Change `handleConfirmReceive` to set `showFifoReminder = true` and stash the receive payload instead of calling `receiveShipment.mutate()` directly
3. Add a new `onAcknowledgeFifo` handler that closes the dialog and fires `receiveShipment.mutate()` with the stashed payload
4. Render a `PlatformAlertDialog` at the bottom of the component:
   - Title: "Stock Rotation Reminder"
   - Icon: `RotateCcw` or `AlertTriangle`
   - Body: Checklist-style reminder (bring old stock forward, place new stock behind, check for expiry)
   - Cancel button: goes back to the receive form
   - Confirm button: "I've Rotated Stock — Confirm Receive"

**1 file edited, 0 new files, 0 migrations.**

