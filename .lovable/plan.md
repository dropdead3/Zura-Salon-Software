

## Fix: Tip Drill-Down Should Show Visit-Level Detail, Not Single Line Item

### The Problem

Phorest duplicates the tip amount across every service line item in a single client visit. For the stylist with `phorest_staff_id: isBQ0Ma-NprbGsIR52Elvw`, the raw data shows:

- Partial Balayage — $185 revenue — $228 tip
- Root Smudge (Add on) — $50 revenue — $228 tip  
- Haircut (Add On) — $50 revenue — $228 tip

All three are the same visit (same client, same date, same tip amount). The current deduplication in `StylistAppointmentList` keeps only the first record it encounters and discards the others. So you see "Haircut (Add On) — $228" which looks wrong.

The aggregate totals ($228 total tips for this stylist) are correct — the bug is only in the expanded appointment sub-list.

### The Fix

**File: `src/components/dashboard/sales/TipsDrilldownPanel.tsx` — `StylistAppointmentList` component (lines 364-378)**

Instead of deduplicating to a single row, group appointments by visit key (`staff_id|client_id|date|tip_amount`) and concatenate the service names. Each visit becomes one row showing all services performed.

```typescript
// Before (broken): keeps one arbitrary line item
const deduped = filtered.filter(a => {
  const k = `${a.phorest_staff_id}|${a.phorest_client_id}|${a.appointment_date}|${tip}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

// After (fixed): group by visit, merge service names
const visitMap = new Map<string, { services: string[]; tip: number; date: string }>();
for (const a of filtered) {
  const tip = a.tip_amount ?? 0;
  const k = `${a.phorest_staff_id}|${a.phorest_client_id}|${a.appointment_date}|${tip}`;
  const existing = visitMap.get(k);
  if (existing) {
    if (a.service_name && !existing.services.includes(a.service_name)) {
      existing.services.push(a.service_name);
    }
  } else {
    visitMap.set(k, {
      services: a.service_name ? [a.service_name] : [],
      tip,
      date: a.appointment_date,
    });
  }
}
return Array.from(visitMap.values())
  .sort((a, b) => b.date.localeCompare(a.date));
```

The rendered row then shows: **Feb 23 — Partial Balayage, Root Smudge (Add on), Haircut (Add On) — $228.00**

This also fixes the appointment count shown in the row — "3 appts" is the raw line-item count from Phorest, which is technically correct (3 services were rendered). The drill-down now clarifies that those 3 services were part of fewer actual visits.

### Files Changed

| File | Change |
|---|---|
| `src/components/dashboard/sales/TipsDrilldownPanel.tsx` | Refactor `StylistAppointmentList` to group by visit and concatenate service names instead of discarding duplicates |

One component refactored, ~15 lines changed. No new queries, no schema changes.

