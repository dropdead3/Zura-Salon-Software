

## Fix: No Services in Demo Mode

### Root Cause
When entering demo mode via "Dev Tester" bypass, `locationId` is pulled from `localStorage('dock-location-id')`. If no location has been configured in the Device Switcher, this is an empty string. The services hook (`useServicesByCategory`) receives `undefined` and its query is disabled (`enabled: !!locationId`), resulting in "No services available."

### Fix

**1. `src/components/dock/DockPinGate.tsx`** (demo bypass button)
- When `deviceLocId` is empty, fall back to the first available location from the `locations` table
- Fetch locations and use `locations[0].id` as default, OR simply hard-code a sensible fallback behavior

Better approach: make the Device Switcher auto-select the first location if none is configured.

**2. `src/components/dock/DockDeviceSwitcher.tsx`**
- On mount, if `localStorage('dock-location-id')` is empty and locations are loaded, auto-select the first location and persist it to localStorage
- This ensures demo mode always has a valid location

**3. `src/components/dock/DockPinGate.tsx`** (demo bypass)
- After the auto-select in DeviceSwitcher, the demo bypass will naturally pick up the localStorage value
- As a safety net, also fetch locations in the PinGate and use `locations[0]?.id` as fallback when `deviceLocId` is empty

### Summary
The fix ensures that when no explicit device location is configured, the system auto-selects the first available location. This makes demo mode functional out of the box without requiring manual location selection in the Device Switcher first.

