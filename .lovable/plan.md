

## Demo Reset — Complete Gap Analysis

### Current reset handler (`DockDeviceSwitcher.tsx`)
The `handleDemoReset` function currently:
- Clears `dock-location-id` and `dock-staff-filter` from localStorage
- Invalidates 3 query keys
- Dispatches `dock-demo-reset` custom event

Only `DockServicesTab` listens for `dock-demo-reset` and clears `dock-demo-bowls::*` keys.

### Gaps — sessionStorage keys NOT cleared on reset

| Key pattern | Source | What it stores |
|-------------|--------|---------------|
| `dock-alerts-dismissed-demo-*` | `DockClientAlertsBanner` | Dismissed allergy/booking banners |
| `dock-demo-notes::demo-*` | `useAppointmentNotes` | Team notes added in demo |
| `dock-demo-medical-alert::demo-*` | `DockClientTab` | Edited medical alerts |

### Gaps — no `dock-demo-reset` listener

| Component/Hook | What needs resetting |
|----------------|---------------------|
| `DockClientAlertsBanner` | Re-show dismissed alerts (clear `dismissed` state) |
| `useAppointmentNotes` | Clear in-memory `demoNotes` state |
| `DockClientTab` | Clear edited medical alert state (if component is mounted) |

### Gaps — query caches NOT invalidated

| Query key | Source |
|-----------|--------|
| `appointment-notes` | `useAppointmentNotes` |
| `instant-formula-memory` | `useInstantFormulaMemory` |
| `client-formula-history` | `useClientFormulaHistory` |
| `client-visit-history` | `useClientVisitHistory` |
| `client-product-affinity` | `useClientProductAffinity` |

These hold demo data that's static, but invalidating them ensures a clean slate.

### Plan — 4 files

**1. `src/components/dock/DockDeviceSwitcher.tsx`** — Expand `handleDemoReset`:
- Clear all `dock-demo-*` and `dock-alerts-dismissed-demo-*` sessionStorage keys in one loop
- Invalidate additional query keys: `appointment-notes`, `instant-formula-memory`, `client-formula-history`, `client-visit-history`, `client-product-affinity`

**2. `src/components/dock/appointment/DockClientAlertsBanner.tsx`** — Add `dock-demo-reset` listener:
- On reset, call `setDismissed(new Set())` to re-show all alerts

**3. `src/hooks/useAppointmentNotes.ts`** — Add `dock-demo-reset` listener:
- On reset, call `setDemoNotes([])` to clear in-memory demo notes

**4. `src/components/dock/appointment/DockClientTab.tsx`** — Add `dock-demo-reset` listener:
- On reset, clear the local `medicalAlert` editing state back to defaults

### Result
Every piece of demo state — bowls, notes, alerts, medical alerts, and all cached query data — resets cleanly with a single "Reset Demo" tap. No stale data survives across demo sessions.

