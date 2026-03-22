

## Persist Color & Chemical Toggle per User via localStorage

**Problem:** The `showChemicalOnly` toggle resets to `true` on every page load since it's just `useState(true)`.

**Approach:** Use localStorage keyed by `staff.userId` — the Dock is PIN-gated and already has the user identity. No database needed for a simple UI preference on a station device.

**File:** `src/components/dock/schedule/DockScheduleTab.tsx`

**Changes:**

1. **Initialize state from localStorage** — Replace `useState(true)` with a lazy initializer that reads from `localStorage.getItem('dock-chemical-toggle::' + staff.userId)`. Default to `true` if no stored value.

2. **Persist on change** — Replace the bare `setShowChemicalOnly` in `onCheckedChange` with a wrapper that writes to localStorage before updating state.

Key format: `dock-chemical-toggle::{userId}` — scoped per staff member so each stylist keeps their own preference across sessions.

