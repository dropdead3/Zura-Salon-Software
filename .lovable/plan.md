

# Station Hardware Enhancements

Three improvements to the Stations & Hardware system: edit wizard with pre-filled values, persist all hardware fields on create, and a connection health monitor.

## 1. Edit Wizard with Pre-filled Values

**StationHardwareWizard.tsx** — Accept an optional `initialStation` prop (existing `BackroomStation`). When provided:
- Pre-fill `WizardState` from station data (name, location, connection_type, device_name, scale_model, pairing_code)
- Set BLE state to `connected` if connection_type is `ble` and pairing_code exists
- Change "Create Station" button to "Update Station"
- On submit, call `useUpdateBackroomStation` instead of `useCreateBackroomStation`

**StationsHardwareSection.tsx** — Wire the existing Pencil edit button to open the wizard with the station's data instead of the inline quick-edit form. Add state for `editingStation` and pass it to the wizard.

## 2. Persist Hardware Fields via Create Mutation

**useBackroomStations.ts** — Expand `useCreateBackroomStation` mutation params to accept `connection_type`, `device_name`, `scale_model`, `pairing_code`. Expand `useUpdateBackroomStation` similarly.

**BackroomStation interface** — Add `connection_type`, `device_name`, `scale_model`, `pairing_code` fields.

**StationHardwareWizard.tsx** — Update `handleCreate` to pass all fields (connection_type, device_name, scale_model, pairing_code) to the mutation, not just name/location/org.

## 3. Connection Health Monitor

**useBackroomStations.ts** — Add `useStationHealthMonitor` hook:
- Accepts a station ID, runs a periodic "ping" every 30s (simulated in Phase 1 — updates `last_seen_at` via a mutation)
- Returns `{ isOnline, lastSeenAt, ping }` 
- For BLE stations: simulate latency-based online/offline; for direct: always online; for manual: n/a

**StationsHardwareSection.tsx** — Enhance station list rows:
- Show a green/yellow/red dot next to each station based on `last_seen_at` recency (< 1 min = green, < 5 min = yellow, else red)
- Display "Last seen X ago" using `formatDistanceToNow` from date-fns
- Add auto-refresh via `refetchInterval: 30000` on the stations query

## Files Changed

| File | Changes |
|------|---------|
| `src/hooks/backroom/useBackroomStations.ts` | Expand mutation params, add health monitor hook, add interface fields |
| `src/components/dashboard/backroom-settings/StationHardwareWizard.tsx` | Accept `initialStation` prop, support edit mode, persist all fields |
| `src/components/dashboard/backroom-settings/StationsHardwareSection.tsx` | Wire edit button to wizard, add health indicators to station rows |

