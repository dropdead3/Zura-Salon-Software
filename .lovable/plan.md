

## Per-Service Bowl Configurator on Services Tab

### What changes

The Services tab currently treats the entire appointment as one flat bowl grid. The new design groups bowls by individual service, so each color/chemical service on the appointment gets its own section with a header, bowl cards, and an "Add Bowl" card. Non-mixing services (haircuts, styling) are excluded from bowl sections.

### How it works

**1. Parse services from `appointment.service_name`**

The `service_name` field is `+`-delimited (e.g. "Full Highlight + Root Smudge + Glaze Add On + Signature Haircut"). Split on ` + `, then filter to only color/chemical services using the existing `isColorOrChemicalService()` utility. Each qualifying service becomes a section.

**2. Associate mix sessions with services**

The `mix_sessions` table already has an `appointment_service_id` column, but since services aren't stored as individual records, we'll use a simpler approach: add a `service_label` text field to `mix_sessions` to tag which service a session belongs to. When creating a bowl, the user is already inside a specific service section, so we pass the service name through.

Alternatively, we can keep it fully client-side: store a `service_label` on mix_sessions (just a text column, no FK needed) that gets set during bowl creation.

**3. UI restructure — `DockServicesTab.tsx`**

Replace the flat grid with a per-service layout:

```text
┌─────────────────────────────────┐
│  Alerts Banner                  │
├─────────────────────────────────┤
│  Full Highlight  ⋮              │  ← service header
│  ┌──────────┐ ┌──────────┐      │
│  │ Bowl 1   │ │ + Add    │      │
│  │ In Prog  │ │   Bowl   │      │
│  │ lines... │ │          │      │
│  └──────────┘ └──────────┘      │
├─────────────────────────────────┤
│  Root Smudge  ⋮                 │  ← next service
│  ┌──────────┐                   │
│  │ + Add    │                   │
│  │   Bowl   │                   │
│  └──────────┘                   │
│                                 │
│            [+ Add Services]     │  ← bottom button
└─────────────────────────────────┘
```

- Each service section: bold header + `:` menu + 2-column bowl grid
- Bowls are filtered by `service_label` to display under the correct section
- "Start Mixing" empty state only shows if zero services have bowls
- The "Add Bowl" card appears inline in each service's grid
- Bottom: "+ Add Services" button (placeholder for future service addition)

**4. Bowl creation flow update**

When tapping "Add Bowl" inside a service section, the `service_label` is captured and passed through:
- `DockBowlDetectionGate` → `DockNewBowlSheet` → `useCreateDockBowl`
- The `useCreateDockBowl` mutation writes `service_label` to `mix_sessions`
- Demo bowls also store a `service_label` field

### Database migration

Add a `service_label` TEXT column to `mix_sessions`:
```sql
ALTER TABLE public.mix_sessions
  ADD COLUMN IF NOT EXISTS service_label TEXT;
```

Update `useDockMixSessions` query to include `service_label` in the SELECT.

### Files to change

| File | Change |
|------|--------|
| **Migration** | Add `service_label` to `mix_sessions` |
| `src/hooks/dock/useDockMixSessions.ts` | Add `service_label` to interface + SELECT |
| `src/hooks/dock/useDockMixSession.ts` | Accept + write `service_label` on session creation |
| `src/components/dock/appointment/DockServicesTab.tsx` | Major rewrite: parse services, group bowls by service, per-service "Add Bowl", "+ Add Services" button |
| `src/components/dock/mixing/DockNewBowlSheet.tsx` | No change needed (service context is set before opening) |
| `src/hooks/dock/dockDemoData.ts` | Update demo appointments to include `service_label` on demo sessions |

### Result

Stylists see each service as its own mixing zone. A "Full Highlight" can have 3 bowls while "Glaze Add On" has 1 bowl. Vivid services can scale to 10+ bowls per service. The UI matches the reference screenshot with service headers, bowl grids, and an "Add Services" action at the bottom.

