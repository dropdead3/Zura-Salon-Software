

## Diagnosis — Why Jamie isn't showing at North Mesa

**Root cause:** The booking popover queries `v_calendar_stylists` filtered by a single `location_id`. That view (and its parent `v_all_staff`) returns only **`employee_profiles.location_id`** (the singular "primary" location), and ignores the **`location_ids[]`** array (the "also works at" list).

**Jamie's record:**
- `location_id` = `val-vista-lakes` (primary)
- `location_ids` = `['val-vista-lakes', 'north-mesa']` (multi-location)

So when the popover filters `WHERE location_id = 'north-mesa'`, Jamie is excluded — even though her profile says she works at both.

**This is a systemic issue, not a Jamie issue.** Same bug affects every multi-location stylist:
| Stylist | Primary | Also works at | Currently invisible at |
|---|---|---|---|
| Jamie Vieira | val-vista-lakes | north-mesa | **North Mesa** |
| Lex Feddern | val-vista-lakes | north-mesa | **North Mesa** |
| Eric Day | north-mesa | val-vista-lakes | **Val Vista Lakes** |

North Mesa shows 5 stylists in `v_calendar_stylists` but should show 7 (the 5 + Jamie + Lex). Val Vista Lakes shows 13 but should show 14 (Eric is missing there too).

**Doctrine anchor:** `enterprise-multi-location-governance` — the `location_ids[]` array IS the system of record for multi-location staffing; the singular `location_id` is a denormalized "primary" hint. Reads must respect the array.

## Plan — Wave 22: Multi-Location Stylist Visibility Fix

### Fix (single migration + zero app code change)

Update `v_all_staff` view to **emit one row per location_id in `location_ids`** (with fallback to singular `location_id` when the array is null/empty). `v_calendar_stylists` inherits the fix automatically since it selects from `v_all_staff`.

```sql
CREATE OR REPLACE VIEW v_all_staff AS
-- Phorest-mapped staff: explode location_ids
SELECT
  ep.user_id,
  psm.phorest_staff_id,
  psm.phorest_staff_name,
  COALESCE(ep.display_name, ep.full_name, psm.phorest_staff_name, 'Unknown') AS display_name,
  ep.full_name,
  ep.photo_url,
  COALESCE(ep.is_active, true) AS is_active,
  COALESCE(psm.show_on_calendar, true) AS show_on_calendar,
  loc_id AS location_id,
  'phorest' AS source
FROM phorest_staff_mapping psm
LEFT JOIN employee_profiles ep ON ep.user_id = psm.user_id
CROSS JOIN LATERAL unnest(
  COALESCE(
    NULLIF(ep.location_ids, '{}'),
    ARRAY[ep.location_id]::text[]
  )
) AS loc_id
WHERE psm.user_id IS NOT NULL AND loc_id IS NOT NULL

UNION ALL

-- Zura-only staff: same explosion
SELECT
  ep.user_id,
  NULL, NULL,
  COALESCE(ep.display_name, ep.full_name, 'Unknown'),
  ep.full_name, ep.photo_url,
  COALESCE(ep.is_active, true),
  true,
  loc_id, 'zura'
FROM employee_profiles ep
CROSS JOIN LATERAL unnest(
  COALESCE(NULLIF(ep.location_ids, '{}'), ARRAY[ep.location_id]::text[])
) AS loc_id
WHERE NOT EXISTS (SELECT 1 FROM phorest_staff_mapping psm WHERE psm.user_id = ep.user_id)
  AND loc_id IS NOT NULL;
```

`v_calendar_stylists` already does `DISTINCT ON (user_id, location_id)`, so duplicates collapse cleanly.

### Acceptance checks

1. `SELECT * FROM v_calendar_stylists WHERE location_id = 'north-mesa'` returns Jamie + Lex (was 5 rows, now 7)
2. `SELECT * FROM v_calendar_stylists WHERE location_id = 'val-vista-lakes'` includes Eric (was 13 rows, now 14)
3. Open New Booking popover at North Mesa → Jamie appears in Available Stylists
4. Open at Val Vista Lakes → Eric appears
5. No regression: single-location stylists still appear exactly once at their location
6. Other consumers of the view (`useChairAssignments`, `WalkInDialog`, scheduler grid) get the expanded set — verify in Wave 22.1 if any surface needs to suppress duplicates differently

### Files

- New migration: `update v_all_staff to explode location_ids[]`
- No app code changes required

### Deferred

- **P2** UI badge in stylist picker showing "Also at: Val Vista Lakes" so staff know the stylist's home base — trigger: when staff confusion surfaces about which stylist belongs where
- **P2** Audit `useChairAssignments`, `useStylistAvailability`, scheduler column-builder for any singular-`location_id` assumptions still lurking — trigger: spot-check after the view fix lands
- **P2** Backfill consistency check: should `location_ids[]` always include `location_id`? Currently Jamie's array does, Eric's does. Add a constraint or trigger to guarantee — trigger: when a profile is found violating it

