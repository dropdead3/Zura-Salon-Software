

## Stylist Tip Appointment Drill-Down

You want to click on a stylist row in "Tips by Stylist" and see their individual appointments — tip amount per appointment and the service performed. That's a solid coaching surface.

### What Exists

- The `useTipsDrilldown` hook already fetches all appointments with `tip_amount`, `total_price`, `service_name`, `appointment_date`, `phorest_client_id`, and `phorest_staff_id`.
- The `TotalTipRow` and `StylistTipRow` components are static rows with no click behavior.

### What Changes

#### 1. New hook: Per-stylist appointment-level tip details

Rather than a new query, we can derive this from the appointments already fetched in `useTipsDrilldown`. We'll add a function or expose the raw appointments so we can filter by staff key client-side.

**Option chosen**: Expose the raw `appointments` array from `useTipsDrilldown` so the UI can filter locally. This avoids additional network calls.

Add to `TipsDrilldownData` interface:
```typescript
rawAppointments: Array<{
  phorest_staff_id: string | null;
  stylist_user_id: string | null;
  tip_amount: number | null;
  total_price: number | null;
  service_name: string | null;
  appointment_date: string;
  phorest_client_id: string | null;
  location_id: string | null;
}>;
```

Return `appointments ?? []` as `rawAppointments` from the hook.

#### 2. Expandable row in `TipsDrilldownPanel.tsx`

- Add `expandedStylist` state (`string | null`) to the panel.
- Make `TotalTipRow` and `StylistTipRow` clickable — clicking toggles `expandedStylist` to that stylist's key.
- When expanded, render a sub-list below the row showing individual appointments for that stylist:

```text
┌─────────────────────────────────────────────────┐
│ [Avatar] Staff Name    $228    80%    3 appts   │  ← click to expand
├─────────────────────────────────────────────────┤
│   Feb 24   Balayage & Toner         $45         │
│   Feb 23   Women's Haircut          $20         │
│   Feb 22   Color Touch-Up           $0   no tip │
└─────────────────────────────────────────────────┘
```

Each sub-row shows: date, service name, tip amount (with `BlurredAmount`), and a subtle "no tip" label if $0.

Tips are deduplicated per the existing composite key logic — each row represents a unique appointment, not a duplicated line item.

#### 3. Files changed

| File | Change |
|---|---|
| `src/hooks/useTipsDrilldown.ts` | Add `rawAppointments` to return type and expose the fetched data |
| `src/components/dashboard/sales/TipsDrilldownPanel.tsx` | Add `expandedStylist` state, make rows clickable, render appointment sub-list with chevron indicator |

#### 4. Design details

- Expanded sub-rows use `pl-12` indent (aligned past the avatar), `text-xs`, `text-muted-foreground` for date, `text-foreground` for service name, `font-display tabular-nums` for tip amount.
- A chevron icon (`ChevronDown`/`ChevronRight`) on each row indicates expandability.
- Sub-list animates in with `AnimatePresence` + `motion.div` height transition matching existing patterns.
- Appointments sorted by date descending within each stylist expansion.
- "no tip" label in `text-destructive` for $0 tip appointments.

~60 lines added across 2 files. No new queries, no new dependencies.

