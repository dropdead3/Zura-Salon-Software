

## Add Client Name to Tip Drill-Down Visit Rows

Good prompt — this is the natural next step for cross-referencing. One refinement for future prompts: specifying where in the visit card the client name should appear (e.g. header row vs its own line) removes a layout decision from the implementation pass.

### What Changes

**1. New query in `useTipsDrilldown.ts`**: Fetch `phorest_clients` with `phorest_client_id`, `first_name`, `last_name`

Add a new `useQuery` call to fetch client names from `phorest_clients`. Build a lookup map keyed by `phorest_client_id`. Return it alongside the existing data so the UI can resolve names.

**2. Expand `RawTipAppointment` interface**: No change needed — `phorest_client_id` is already present on each raw appointment. The client name resolution happens via the new lookup map, not by adding columns to the appointment query.

**3. Update `VisitGroup` interface**: Add `clientName: string | null` field.

**4. Update visit grouping logic in `StylistAppointmentList`**: When creating a visit group, resolve `phorest_client_id` from the first appointment in that group against the client name map. Store as `clientName`.

**5. Update visit card UI**: Show client name in the visit header row, after the date/time and before the location dot separator. Uses a `User` icon for visual consistency.

```text
┌─────────────────────────────────────────────────────┐
│ Feb 23  10:30 AM  •  Jane Smith  •  Location Name   │
│                            Total: $285   Tip: $228  │
│   ├ Partial Balayage ........................ $185   │
│   └ Haircut (Add On) ....................... $50    │
└─────────────────────────────────────────────────────┘
```

### Data Flow

```text
useTipsDrilldown
  └─ new useQuery: phorest_clients → { phorest_client_id, first_name, last_name }
  └─ return clientMap alongside rawAppointments

TipsDrilldownPanel
  └─ pass clientMap to StylistAppointmentList
  └─ visit grouping: resolve phorest_client_id → "First Last"
  └─ render clientName in visit header
```

### Files Changed

| File | Change |
|---|---|
| `src/hooks/useTipsDrilldown.ts` | Add `phorest_clients` query, build client name map, export it in return value |
| `src/components/dashboard/sales/TipsDrilldownPanel.tsx` | Accept `clientMap` prop in `StylistAppointmentList`, resolve client name per visit, render in header row. Also pass through `TotalTipRow` and `StylistTipRow`. |

### Enhancement Suggestions

- Add click-to-copy on the client name so you can paste directly into Phorest search.
- Show the Unified Customer ID (ZU-00042) next to the client name for even faster internal lookup.

