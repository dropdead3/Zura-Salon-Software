

## Filter Dock Schedule by Color/Chemical Services

### Approach: `is_backroom_tracked` vs Regex vs Allowance Policy

Three options considered:

1. **Regex pattern matching** (`isColorOrChemicalService`) — already exists but brittle; misses custom service names and can't account for salon-specific configurations.
2. **`service_allowance_policies`** — only covers services with billing policies set up, which may not include all chemical services (e.g., a salon might track a service in backroom but not yet configure an allowance).
3. **`is_backroom_tracked` on the `services` table** — explicitly configured by the salon owner to mark which services require backroom chemical mixing. This is the most reliable and is already the source of truth used across backroom settings, recipe baselines, and inventory tracking.

**Recommendation: Use `is_backroom_tracked`** as the primary filter. It's the owner-configured flag that directly answers "does this service need chemical prep?" If no tracked services are configured, fall back to the existing `isColorOrChemicalService` regex as a reasonable default.

### Design

A small toggle in the header area below the title:
- **Color & Chemical** (default, active) — shows only appointments where at least one service in the comma-separated `service_name` matches a backroom-tracked service name
- **All Appointments** — shows everything (for when a stylist wants to see a haircut and potentially add color)

### Changes

**1. New hook: `src/hooks/dock/useDockTrackedServices.ts`**
- Fetches `services` where `is_backroom_tracked = true` for the organization
- Returns a `Set<string>` of lowercase service names for fast lookup
- Falls back: if the set is empty, returns `null` to signal "use regex fallback"
- Lightweight query, cached with long staleTime

**2. `src/components/dock/schedule/DockScheduleTab.tsx`**
- Import the new hook + the `Switch` component
- Add state: `showChemicalOnly` (default `true`)
- Call `useDockTrackedServices` with the org ID (available from staff context or a small addition)
- Before grouping, filter appointments: if `showChemicalOnly`, keep only appointments where at least one comma-separated service name is in the tracked set (or matches `isColorOrChemicalService` if no tracked services configured)
- Render a toggle row below the header: label "Color & Chemical" with a Switch, muted styling

**3. `src/hooks/dock/useDockAppointments.ts`**
- No changes needed — filtering happens at the UI layer so the toggle is instant with no refetch

### Matching Logic

Since `service_name` can be comma-separated (e.g., "Haircut, Balayage + Toner"):
```text
Split by comma → trim each → check if ANY segment matches a tracked service name
```

This ensures a "Haircut, Balayage" appointment still shows in color/chemical view because "Balayage" is tracked.

### Technical Detail

The organization ID is needed for the tracked services query. The Dock already has `locationId` — we'll derive `orgId` from the staff session or add it as context. Looking at the existing `DockStaffSession` type, it includes `organizationId`.

