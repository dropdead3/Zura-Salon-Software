

## Rethink Dock Location Binding for Multi-Location Staff

### The Problem

Currently, when a staff member logs in via PIN:
1. `validate_dock_pin` returns a single `location_id` from their profile
2. If `dock-location-id` isn't set in localStorage, it blindly uses that single ID
3. Staff with multiple `location_ids` always get bound to whichever one the DB function returns — no choice

The "Move Zura Dock" flow clears localStorage and hopes the next PIN login will "just work," but for multi-location staff, there's no prompt to pick which location.

### Proposed Solution: Location Picker After PIN

Add a **location selection step** between successful PIN validation and session start, but **only when needed**:

```text
PIN Entry → PIN Valid → Staff has multiple locations?
  ├─ No  → Auto-bind (current behavior)
  └─ Yes → Show location picker → Bind selected location
```

If a `dock-location-id` is already set in localStorage (device previously bound), skip the picker and use the stored value. The picker only appears when:
- No device-bound location exists, AND
- The staff member has multiple location assignments

### Implementation

**1. Update `validate_dock_pin` DB function** (migration)
- Return `location_ids` (text array) alongside the existing `location_id` so the frontend knows if there are multiple assignments.

**2. Create `src/components/dock/DockLocationPicker.tsx`**
- A full-screen overlay (matching Dock UI standards — `absolute inset-0`, dark theme) showing location cards.
- Each card displays the location name; tapping one sets `dock-location-id` in localStorage and completes the session.
- Uses the same visual language as the PIN gate (gradient accent, platform theme).

**3. Modify `src/components/dock/DockPinGate.tsx`**
- After successful PIN validation, check: if no `dock-location-id` in localStorage AND `data.location_ids.length > 1`, show `DockLocationPicker` instead of immediately calling `onSuccess`.
- If only one location or device already bound, proceed as today.

**4. Modify `src/components/dock/settings/DockSettingsTab.tsx`**
- Update the "Move Zura Dock" description to clarify that after unbinding, the next login will prompt for location selection if the staff member serves multiple locations.

### Files

| Action | File |
|--------|------|
| Migration | Update `validate_dock_pin` to return `location_ids` array |
| Create | `src/components/dock/DockLocationPicker.tsx` |
| Modify | `src/components/dock/DockPinGate.tsx` |
| Modify | `src/components/dock/settings/DockSettingsTab.tsx` |

