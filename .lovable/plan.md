

## Why Top Performers Shows Empty

Good catch. The root cause is a data mapping gap.

### Diagnosis

The `useSalesByStylist` hook (line 357 of `useSalesData.ts`) fetches appointments, then tries to resolve each `phorest_staff_id` through the `phorest_staff_mapping` table. If there's no match, it silently drops the appointment (`if (!mapping) return;` at line 406).

**Current state:**
- `phorest_staff_mapping` has 2 entries, both for the same user ("Eric Day") with IDs `4jTo1SI4WSBx2vPb04V-TA` and `Hf5ZjWjkGzHng_HDPX5HiA`
- Actual appointments use 19 completely different `phorest_staff_id` values (e.g. `gqB7ijXMpf7uYTp7ML61QQ`)
- None of the 19 IDs exist in `phorest_staff_mapping`
- Result: every appointment is dropped → empty leaderboard

The tips drill-down works because it uses a different strategy: it uses `stylist_user_id` first, then falls back to `phorest:${phorest_staff_id}` as a synthetic key and resolves names from `phorest_staff_mapping.phorest_staff_name`.

### Fix

Update `useSalesByStylist` to stop silently dropping unmapped staff. Instead, use the same fallback pattern as the tips hook:

1. Try to resolve via `phorest_staff_mapping` → `user_id` → `employee_profiles` (current behavior, keeps working for mapped staff)
2. If no mapping exists, use `phorest:${phorest_staff_id}` as the aggregation key
3. For the display name, try `phorest_staff_mapping.phorest_staff_name` first, then fall back to a truncated staff ID label (e.g. "Staff gqB7")

**File changed:** `src/hooks/useSalesData.ts` — `useSalesByStylist` function (lines 357-431)

### Technical Detail

```text
Current flow:
  appointment.phorest_staff_id → mappingLookup[id]
  → if no match → DROPPED (line 406)

New flow:
  appointment.phorest_staff_id → mappingLookup[id]
  → if match → aggregate by user_id (existing behavior)
  → if no match → aggregate by "phorest:{staff_id}"
     → name from phorest_staff_mapping.phorest_staff_name
     → fallback: "Staff {first 4 chars of ID}"
```

The `phorest_staff_mapping` query already runs (line 362); we just need to also build a secondary name-only lookup for unmapped IDs and remove the early `return` on line 406.

### Enhancement Suggestions

- Run a full staff sync from Phorest to populate `phorest_staff_mapping` for all 19 active staff IDs so names resolve properly across all surfaces.
- Add a "Staff Mapping" admin alert that flags when appointments reference unmapped staff IDs.

