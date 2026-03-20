

## Connect Acaia Pearl BLE Scale via Capacitor

### Acaia Pearl BLE Protocol (from reverse-engineered open-source libraries)

The Acaia Pearl uses a **custom GATT service** (not the standard weight service):
- **Service UUID**: `00001820-0000-1000-8000-00805f9b34fb` (or discovered via name prefix `ACAIA` / `PEARL`)
- **Weight Characteristic**: `00002a80-0000-1000-8000-00805f9b34fb` — subscribe to notifications
- **Command Characteristic**: same handle — write tare/start-weight-stream commands
- **Packet format**: proprietary binary. Weight is encoded in a notification payload that needs decoding (header byte, event type, sign, weight bytes as little-endian, unit flag)
- **Heartbeat**: the scale requires periodic "ident" packets (~3s) or it disconnects after ~5s of silence

### Plan

**1. Install Capacitor + BLE plugin** (npm packages)

Add to `package.json`:
- `@capacitor/core`
- `@capacitor/cli` (dev)
- `@capacitor/ios`
- `@capacitor/android`
- `@capacitor-community/bluetooth-le` — the standard Capacitor BLE plugin

Create `capacitor.config.ts` with:
- `appId`: `app.lovable.b06a574464b646299f76e0e2cb73ea52`
- `appName`: `Zura Dock`
- `server.url` pointing to the preview URL for hot-reload

**2. New file: `src/lib/backroom/acaia-protocol.ts`** — Acaia Pearl packet codec

Pure TypeScript, no native dependencies. Handles:
- `encodeIdent()` — the heartbeat/identification packet the scale expects every ~3s
- `encodeTare()` — tare command bytes
- `encodeStartWeightNotifications()` — tells the scale to begin streaming weight
- `decodeNotification(data: DataView): { weight: number; unit: string; stable: boolean } | null` — parses the proprietary binary notification into a weight reading
- Constants: service UUID, characteristic UUIDs, device name prefix filter (`ACAIA`, `PROCHBT`)

This is based on the open-source `btscale` and `pyacaia` reverse-engineering work.

**3. Rewrite: `src/lib/backroom/scale-adapter.ts`** — Real BLE adapter

Replace the `BLEScaleAdapter` stub with a real implementation using `@capacitor-community/bluetooth-le`:

```text
connect():
  1. BleClient.initialize()
  2. BleClient.requestDevice({ namePrefix: ['ACAIA', 'PROCHBT'] })
  3. BleClient.connect(deviceId, onDisconnect)
  4. BleClient.startNotifications(deviceId, serviceUuid, charUuid, onNotification)
  5. Start heartbeat interval (encodeIdent every 3s)
  6. Update state: scanning → pairing → connected

onNotification(data):
  1. Parse via decodeNotification()
  2. If valid weight → emit WeightEvent to all listeners
  3. Update state to stable_reading or unstable_reading based on stable flag

disconnect():
  1. Clear heartbeat interval
  2. BleClient.stopNotifications()
  3. BleClient.disconnect()
  
tare():
  1. BleClient.write(deviceId, serviceUuid, charUuid, encodeTare())
```

Add a `tare()` method to the `ScaleAdapter` interface (needed for bowl detection gate).

**4. Update: `src/components/dock/scale/DockScaleTab.tsx`**

- Remove simulated `setTimeout` state transitions
- Use the real adapter's `connect()` which now drives actual BLE
- Add "Tare" button when connected
- Show live weight from adapter's `onReading` callback
- Show device name after pairing (from `BleClient.requestDevice` result)
- Graceful fallback: if `BleClient.initialize()` throws (running in browser, not Capacitor), show a message "BLE requires the native Zura Dock app"

**5. Update: `src/components/dock/mixing/DockBowlDetectionGate.tsx`**

- In "taring" phase, actually call `adapter.tare()` instead of just waiting
- Listen for `onReading` to confirm zero weight after tare
- Demo mode still auto-advances as before

### What the user needs to do locally

After these code changes are deployed:
1. Export to GitHub, `git pull`
2. `npm install`
3. `npx cap init` (config file will already exist)
4. `npx cap add ios`
5. `npx cap sync`
6. Open in Xcode: `npx cap open ios`
7. Ensure Bluetooth permission keys are in `Info.plist` (`NSBluetoothAlwaysUsageDescription`)
8. Build and run on a real iPad with the Acaia Pearl powered on

### Files

| File | Action |
|------|--------|
| `package.json` | Add Capacitor + BLE deps |
| `capacitor.config.ts` | Create — Capacitor config |
| `src/lib/backroom/acaia-protocol.ts` | Create — Acaia packet codec |
| `src/lib/backroom/scale-adapter.ts` | Rewrite BLEScaleAdapter with real BLE |
| `src/components/dock/scale/DockScaleTab.tsx` | Update to use real adapter + live weight |
| `src/components/dock/mixing/DockBowlDetectionGate.tsx` | Wire tare to real adapter |

