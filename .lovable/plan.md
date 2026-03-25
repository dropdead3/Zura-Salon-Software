

## Fix Bowl Count Badges to Reflect Actual Mixed Bowls

### Problem
1. **Demo data**: Rachel Kim's card shows "2 bowls mixed" but has no mix sessions — the `mix_bowl_count` is hardcoded incorrectly
2. **Real data**: The query counts ALL `mix_bowls` rows for an appointment, including empty/draft bowls with no dispensed product. Should only count bowls where mixing has actually occurred.

### Changes

**1. `src/hooks/dock/dockDemoData.ts`**
- Fix Rachel Kim (`demo-appt-7`): set `mix_bowl_count: 0` (no sessions exist for her)
- Audit other demo appointments and align counts with what `DEMO_MIX_SESSIONS` actually contains

**2. `src/hooks/dock/useDockAppointments.ts`**
- Change the bowl count query to use `mix_bowl_projections` instead of raw `mix_bowls`
- Filter to only count bowls where `line_item_count > 0` (has at least one dispensed ingredient)
- This applies to both the demo-with-real-data path (~lines 160-168) and the normal path (~lines 289-297)
- Query: `select mix_bowl_id, mix_session_id from mix_bowl_projections where line_item_count > 0` joined through sessions

### Files
- `src/hooks/dock/dockDemoData.ts` — fix hardcoded counts
- `src/hooks/dock/useDockAppointments.ts` — filter bowl counts by actual dispensed activity

