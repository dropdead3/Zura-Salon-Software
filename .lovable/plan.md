

# Always-Available "Clear Display" Button for Terminal Readers

## Problem
The "Clear" button only appears while `testingReaderId` state is set (during the 10-second test window). If the page refreshes, the timer fires but the Stripe API call fails, or the user navigates away and back — the Clear button disappears while the cart data remains on the physical reader. There's no way to reset the reader.

## Solution
Make the "Clear Display" action always accessible for online readers, not just during an active test. This is a simple UI restructuring — no backend changes needed.

## Changes

**File: `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx`**

1. **Always show both Test and Clear buttons** for online readers. Remove the conditional that hides Clear when `testingReaderId !== reader.id`. Instead, show both side-by-side:
   - "Test" button (pushes sample cart) — disabled while a test is active on that reader
   - "Clear" button (clears reader display) — always visible for online readers

2. **Keep the visual emphasis during active test**: When `testingReaderId === reader.id`, highlight the Clear button with the existing destructive styling to draw attention. When no test is active, use a subtle ghost/outline style so it doesn't dominate.

3. **Decouple `handleClearDisplay` from `testingReaderId`**: Allow `handleClearDisplay` to be called even when `testingReaderId` is null (it already works this way in the function body — just remove the UI guard).

The result: users can always tap "Clear" to reset a reader's display, whether or not they just ran a test from this session.

