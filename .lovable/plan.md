

## Plan: Add Demo Mode to the Dock App

### Approach
Create a React Context (`DockDemoContext`) that provides mock data when demo mode is active. Each data hook checks this context first — if demo mode is on, return static mock data instead of querying the database. Demo mode activates via the "Dev Bypass" button on the PIN gate.

### 1. Create `src/hooks/dock/dockDemoData.ts`
Static mock data file containing:
- **6 mock appointments** across Active/Scheduled/Completed statuses with realistic salon names and times
- **3 mock brands** (Wella, Redken, Schwarzkopf) with ~4-5 products each, including swatch colors and wholesale prices
- **2 mock mix sessions** (one active, one completed) with bowl data

### 2. Create `src/contexts/DockDemoContext.tsx`
- `DockDemoProvider` wrapping the Dock page
- `useDockDemo()` hook returning `{ isDemoMode, appointments, brands, products, sessions }`
- Demo mode is enabled when `staff.userId === 'dev-bypass-000'`

### 3. Update data hooks to check demo mode
Modify these hooks to short-circuit with mock data when demo mode is active:
- **`useDockAppointments.ts`** — return mock appointments
- **`useDockProductCatalog.ts`** — return mock brands/products
- **`useDockMixSessions.ts`** — return mock sessions

Each hook calls `useDockDemo()` and if `isDemoMode`, returns a static `useQuery` with `initialData` and `queryFn` that returns the mock data (no Supabase call).

### 4. Update `Dock.tsx`
Wrap `DockLayout` in `DockDemoProvider`, passing the staff session so the context knows whether to enable demo mode.

### 5. Update `DockPinGate.tsx`
Change the Dev Bypass button label to "Demo Mode →" to make it clearer.

### Technical details
- Mock appointment IDs use `demo-appt-{n}` prefix so they won't collide with real UUIDs
- Mock product IDs use `demo-prod-{n}` prefix
- The `useCreateDockBowl` mutation in `DockServicesTab` will be a no-op in demo mode (show a toast saying "Demo mode — bowl creation simulated")
- All mock data is purely in-memory; no database writes

