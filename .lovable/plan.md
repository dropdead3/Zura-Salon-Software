

# Stations & Hardware Setup Wizard

## What We're Building

A dedicated multi-step wizard for connecting stations to hardware (iPad tablets and Bluetooth scales). Launched from the Stations & Hardware section. Guides the admin through: naming a station, assigning it to a location, choosing a connection method (Bluetooth or direct iPad), and pairing a scale — with live connection status feedback.

## Existing Infrastructure

- `backroom_stations` table has `assigned_device_id`, `assigned_scale_id`, `last_seen_at`, `is_active`
- `ScaleAdapter` interface + `ManualScaleAdapter` already exist with `ConnectionState` types (disconnected, scanning, pairing, connected, stable_reading, manual_override)
- `ScaleConnectionStatus` badge component exists
- `useCreateBackroomStation` / `useUpdateBackroomStation` hooks ready
- The main setup wizard (5-step) already creates a basic station in step 5 — this new wizard is a deeper, hardware-focused flow

## New Database Columns (migration)

Add to `backroom_stations`:
- `connection_type` (text, default `'manual'`) — values: `manual`, `ble`, `direct`
- `device_name` (text, nullable) — friendly name of iPad/tablet
- `scale_model` (text, nullable) — scale brand/model for display
- `pairing_code` (text, nullable) — stored pairing reference for BLE reconnect

## New Files

| File | Purpose |
|------|---------|
| `src/components/dashboard/backroom-settings/StationHardwareWizard.tsx` | 4-step wizard component |

## Modified Files

| File | Change |
|------|--------|
| `src/components/dashboard/backroom-settings/StationsHardwareSection.tsx` | Add "Setup New Station" button launching the wizard |
| `src/lib/backroom/scale-adapter.ts` | Add `BLEScaleAdapter` stub with simulated scanning/pairing states |

## Wizard Steps (4 steps)

### Step 1 — Station Identity
- Station name input
- Location selector (from existing locations)
- Optional description/notes

### Step 2 — Device Assignment
- Choose connection type: **Bluetooth** or **Direct (iPad)**
- If Direct: enter device name/identifier, show instructions for installing the Zura Backroom iPad app
- If Bluetooth: show "We'll scan for devices in the next step"
- Visual cards for each option with icons

### Step 3 — Scale Pairing
- If Bluetooth: simulated BLE scan animation → show discovered devices list → select to pair → pairing animation → confirmation
- If Direct: manual scale ID entry with "Test Connection" button
- If Manual fallback: skip to confirmation with "Manual Mode" badge
- Uses `ScaleConnectionStatus` component to show live state transitions
- "Use Manual Entry Instead" fallback link

### Step 4 — Confirmation
- Summary card: station name, location, connection type, device, scale
- Status badges for each component
- "Create Station" button persists to `backroom_stations` with all fields

## Technical Details

- Wizard uses same `framer-motion` slide pattern as the main setup wizard
- BLE scanning is simulated in Phase 1 (no real Capacitor BLE yet) — shows realistic state transitions with timeouts
- `BLEScaleAdapter` stub cycles through: `disconnected` → `scanning` (2s) → `pairing` (1.5s) → `connected`
- Station is created via `useCreateBackroomStation` with new fields on completion
- Wizard is rendered inline in `StationsHardwareSection` (replaces content when active), not a dialog

