

# Wire Up Test Display & Add Clear/Timeout

## Problem
1. The Fleet tab "Test" button sends sample cart data (`Sample Haircut`, `Styling Product`) that doesn't match the Display tab's designed sample cart (`Balayage Full Head`, `Olaplex Treatment`, `Blowout & Style`)
2. The 8-second auto-clear blocks the UI (spinner) with no way to manually clear early
3. No explicit "Clear Display" action available to the user

## Changes

### 1. Match test data to Display tab design
In `ZuraPayFleetTab.tsx`, replace the hardcoded `line_items` in `handleTestDisplay` with the same `SAMPLE_CART` items used in `CheckoutDisplayConcept.tsx`:
- `Balayage Full Head` — $185.00
- `Olaplex Treatment` — $45.00  
- `Blowout & Style` — $65.00
- Tax calculated at a reasonable rate (~8%)

### 2. Non-blocking auto-clear with manual override
Replace the current blocking `await setTimeout(8000)` pattern:
- After pushing cart data, start a 10-second countdown using `setTimeout` (stored in a ref)
- Show a "Clear" button on the reader row that immediately clears the display and cancels the timer
- If 10 seconds elapse without manual clear, auto-clear fires
- Toast updated to reflect: "Clearing automatically in 10s — or tap Clear"

### 3. UI for clear action
While a test is active on a reader:
- Replace the "Test" button with a "Clear" button (with X or eraser icon)
- Clicking it calls `clear_reader_display` and cancels the timeout
- After clear (manual or auto), revert back to "Test" button

## Files
- **Edit**: `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx` — update sample data, add clear button, implement 10s auto-timeout with ref-based timer

