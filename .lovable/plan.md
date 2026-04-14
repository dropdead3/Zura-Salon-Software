

# Reader Firmware Status Indicator

## What this does
Compares each reader's `device_sw_version` against the known latest version for its device type. Displays a small badge or subtitle indicating whether firmware is current or outdated.

## Limitations (Stripe API constraint)
- Cannot detect "currently updating" — Stripe does not expose this state
- Cannot query "update available" — we maintain a hardcoded latest-version map
- The version map will need periodic manual updates as Stripe releases new firmware

## Changes

### 1. Add version constants and comparison helper
**File:** `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx`

Add a map of latest known firmware versions per device type:
```text
stripe_s700 → 2.40.1.0
stripe_s710 → 2.40.1.0
bbpos_wisepos_e → 2.40.1.0
```

Add a `compareVersions(current, latest)` helper that returns `'current' | 'outdated' | 'unknown'`.

### 2. Show firmware status in reader row
In the existing firmware line (line ~641), append a small indicator:
- **Up to date** → small green check icon, no extra text (clean)
- **Update available** → amber `Update Available` text with info tooltip explaining "Leave reader powered on overnight to receive automatic updates"
- **Unknown** → no indicator (graceful fallback)

### 3. No backend changes needed
The `device_sw_version` is already returned by the Stripe API and already present in the Reader interface and UI. This is purely a frontend comparison.

