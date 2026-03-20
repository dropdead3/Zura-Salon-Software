

## Add "Launch Demo" from Platform Account Detail

### What This Does
Adds a "Launch Demo" button to the **Apps in Use** card on the Platform Admin account detail page. Clicking it opens the Dock (`/dock`) in a new tab, pre-scoped to that organization, using their **real services and clients** but in read-only demo mode (no writes to scheduler/analytics).

### How It Works

**1. URL-based org scoping for demo mode**
- The Dock route (`/dock`) will accept a query parameter: `?demo=<organizationId>`
- When this param is present, `DockPinGate` skips the PIN screen entirely and boots directly into demo mode with that org's ID
- This is gated behind `useDockDemoAccess()` (only works in preview/dev/Lovable contexts, not production)

**2. Demo mode uses real org data (read-only)**
- Currently demo mode uses hardcoded `DEMO_SERVICES` and `DEMO_CLIENTS`. We'll change this: when `isDemoMode && organizationId` is set, the booking sheet and schedule will **fetch real services and clients from the DB** for that org, but all **mutations** (create appointment, etc.) remain no-ops / mock responses
- This gives sales demos a realistic view of the actual salon's catalog

**3. "Launch Demo" button on AccountAppsCard**
- Next to the Zura Backroom badge, add a `Play` icon button: "Launch Demo"
- Opens `/dock?demo={organizationId}` in a new tab
- Only visible to platform admins (already scoped by the page's access control)

### Files Changed

| File | Change |
|------|--------|
| `src/components/platform/account/AccountAppsCard.tsx` | Add "Launch Demo" button that opens `/dock?demo={orgId}` in new tab |
| `src/pages/Dock.tsx` | Read `?demo=orgId` param; if present + `useDockDemoAccess()`, auto-boot into demo session for that org |
| `src/components/dock/DockPinGate.tsx` | No changes needed — Dock.tsx bypasses PinGate entirely when demo param is present |
| `src/components/dock/schedule/DockNewBookingSheet.tsx` | In demo mode with a real orgId, fetch real services/clients from DB instead of hardcoded mocks; keep mutations as no-ops |
| `src/contexts/DockDemoContext.tsx` | Add a `usesRealData` flag so components know to query the DB but block writes |

### Demo Data Strategy
- **Services**: Query `phorest_services` filtered by the org's locations (real catalog)
- **Clients**: Query `phorest_clients` filtered by org's branch IDs (real client names)
- **Appointments**: Keep using mock `DEMO_APPOINTMENTS` (we don't want to show real schedule)
- **Mix sessions / products**: Keep mock data (safe, no PII)
- **All mutations**: Return mock success, never hit DB

