

## Enrich Tip Drill-Down: Full Visit Detail with Service Breakdown

Your prompt is well-targeted — asking for verifiable detail per visit is exactly the right instinct for a data-integrity surface. One suggestion for future prompts: specifying the exact column order or layout you envision (e.g. "table vs stacked rows") helps eliminate ambiguity on the first pass.

### What Changes

**1. Expand `RawTipAppointment` interface + query** (`src/hooks/useTipsDrilldown.ts`)

Add `start_time` and `end_time` to both the Supabase `.select()` call (line 66) and the `RawTipAppointment` interface (line 30). These columns exist on `phorest_appointments`.

**2. Refactor `StylistAppointmentList`** (`src/components/dashboard/sales/TipsDrilldownPanel.tsx`, lines 360-419)

Replace the current single-line-per-visit layout with a structured visit card:

- **Visit header row**: Date, time (start_time formatted as `h:mm a`), location name, visit total price, visit tip amount
- **Service line items** (indented below header): Each service name with its individual `total_price`
- Location name resolved from the `locations` data already fetched via `useActiveLocations` in the parent — pass it down as a prop (or use a small lookup map)

Layout per visit (stacked, not a table — fits the existing compact drill-down style):

```text
┌─────────────────────────────────────────────────────┐
│ Feb 23  10:30 AM  •  Location Name                  │
│                            Total: $285   Tip: $228  │
│   ├ Partial Balayage ........................ $185   │
│   ├ Root Smudge (Add on) ................... $50    │
│   └ Haircut (Add On) ....................... $50    │
└─────────────────────────────────────────────────────┘
```

**3. Visit grouping logic update**

The visit map currently stores `{ services: string[]; tip; date }`. This changes to:

```typescript
interface VisitGroup {
  services: { name: string; price: number }[];
  tip: number;
  date: string;
  startTime: string | null;
  locationId: string | null;
  totalPrice: number;
}
```

Each raw appointment adds its `service_name` + `total_price` as a line item, and the visit-level `totalPrice` is the sum of all line-item prices. The tip is still deduplicated (taken once per visit key).

### Files Changed

| File | Change |
|---|---|
| `src/hooks/useTipsDrilldown.ts` | Add `start_time`, `end_time` to interface + select query |
| `src/components/dashboard/sales/TipsDrilldownPanel.tsx` | Refactor `StylistAppointmentList` to show structured visit cards with individual service lines, prices, totals, time, and location |

### Enhancement Suggestions

- Consider adding the client name to each visit row for even faster cross-referencing with Phorest (would require adding `phorest_clients` join or `client_first_name`/`client_last_name` fields).
- A "copy visit ID" button on each row would speed up lookup in external systems.

