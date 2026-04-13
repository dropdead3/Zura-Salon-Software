

# Terminal Settings — Remaining Fixes

## Summary
8 remaining issues across `TerminalSettingsContent.tsx` — all in a single file. No migrations, no edge function changes, no new dependencies.

## Changes

### 1. Fix useEffect stale closure (Bug #2)
Line 336-348: Replace the payment verification `useEffect` with a ref-based pattern. Store `verifyPayment.mutate` in a `useRef` so the effect can safely depend on `[searchParams, orgId]` without re-triggering on every render.

### 2. Image fallback via React state (Bug #6 / Gap #6)
Replace the DOM-manipulation `onError` handlers with a `useState<Record<string, boolean>>` map of failed image URLs. When an image fails, set its key to `true` and conditionally render the icon fallback instead. Applies to all three image locations (pricing preview, dialog product image, accessory images).

### 3. Reset dialog state on close
When `setDialogOpen(false)` is called (cancel button + dialog dismiss), also reset `quantity` to `1`, `selectedAccessories` to `{}`, and `reqLocationId` to `''`.

### 4. Use selectedLocation for CheckoutDisplayConcept
Line 1035: Change `locations?.[0]?.name` to `selectedLocation?.name || locations?.[0]?.name` so the concept preview reflects the actively selected location.

### 5. Conditionally render OfflinePaymentStatus
Line 1029: Only render `<OfflinePaymentStatus />` when there are readers (`readers && readers.length > 0`), or when showing all locations.

### 6. Show reader firmware and IP
In the reader list (lines 966-1020), add `device_sw_version` and `ip_address` from the reader object as additional metadata below the serial number line.

### 7. Show affected reader count in delete location dialog
Line 1059: Calculate `readers?.filter(r => r.location === deleteLocationTarget?.id).length` and display it in the confirmation description (e.g., "This location has 2 readers that will need to be reassigned.").

### 8. Add reader count badges to location picker
Lines 816-822: For each location in the picker dropdown, show a small badge with the reader count (requires a lightweight lookup or inline query). Since we already fetch readers for the active location, we'll show the badge only for the currently selected location's count in the trigger text, keeping it simple.

---

## Technical Details

**File modified:** `src/components/dashboard/settings/TerminalSettingsContent.tsx`

- Add `useRef` import
- Add `failedImages` state (`useState<Set<string>>`)
- Wrap `verifyPayment.mutate` in a ref, update effect deps
- Create `handleDialogClose` helper that resets all dialog state
- Guard `OfflinePaymentStatus` with reader count check
- Add firmware/IP metadata spans in reader rows
- Compute affected reader count for delete confirmation
- Pass `selectedLocation?.name` to `CheckoutDisplayConcept`

1 file, 0 migrations, 0 new dependencies.

