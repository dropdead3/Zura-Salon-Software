

# Add "Test Display" Button to Fleet Tab

## What This Does
Adds a "Test Display" button next to each online reader in the Fleet tab. Clicking it pushes sample cart data (e.g., "Sample Haircut $45.00", "Styling Product $22.50") to the physical reader display for ~8 seconds, then auto-clears it. This lets operators verify end-to-end connectivity without processing a real payment.

## Changes

### `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx`

In the reader row (lines 640-722), add a "Test Display" button between the status badge and the delete button for online readers only:

- Import `useAuth` to get the current user's organization context
- Add local state `testingReaderId` to track which reader is being tested
- On click:
  1. Set `testingReaderId` to the reader's ID
  2. Call `supabase.functions.invoke('terminal-reader-display', { body: { action: 'set_reader_display', reader_id, organization_id, line_items: [...sample items], tax: 382 } })`
  3. Wait 8 seconds
  4. Call `clear_reader_display` to reset the screen
  5. Toast success/error
  6. Clear `testingReaderId`

- Button styling: `variant="outline"` `size="sm"` with `MonitorSmartphone` icon, shows `Loader2` spinner while testing
- Only visible for readers with `status === 'online'`

Sample cart data:
```text
Line 1: "Sample Haircut"         — $45.00 × 1
Line 2: "Styling Product"        — $22.50 × 2
Tax:    $3.82
Total:  $93.32
```

### No edge function changes needed
The existing `set_reader_display` and `clear_reader_display` actions in `terminal-reader-display` already support exactly this use case.

## Technical Notes
- The `organization_id` comes from the component's existing location data (`selectedLoc`) which has the org reference, or from the auth context
- Need to find how org ID is available — will check `useAuth` or derive from `locations[0]` prop which likely has `organization_id`
- The 8-second display duration gives enough time to visually confirm the reader screen updates

