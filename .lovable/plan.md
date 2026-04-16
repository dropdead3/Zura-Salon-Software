

# Fix: Phorest Breaks Not Syncing — Wrong API Endpoint

## Root Cause

The `syncRoster` function calls **`/branch/{branchId}/roster`** — an endpoint that **does not exist** in the Phorest Third-Party API. The correct endpoint is:

```
GET /api/business/{businessId}/branch/{branchId}/break?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD&size=100&page=0
```

This returns a paginated response:
```json
{
  "_embedded": {
    "breaks": [
      {
        "breakId": "abc123",
        "breakDate": "2026-04-16",
        "startTime": "12:00:00",
        "endTime": "12:30:00",
        "staffId": "xyz789",
        "label": "Lunch",
        "paidBreak": false
      }
    ]
  },
  "page": { "size": 100, "totalElements": 5, "totalPages": 1, "number": 0 }
}
```

The response is **flat** (no nested shifts/roster entries). Each break is a direct object with `breakDate`, `startTime`, `endTime`, `staffId`, `label`, `breakId`.

## Changes Required

### 1. `supabase/functions/sync-phorest-data/index.ts` — Rewrite `syncRoster`

Replace the current function with one that:
- Calls `/branch/{branchId}/break?from_date=X&to_date=Y&size=100&page=N`
- Paginates through all pages (max 100 per page)
- Maps each `BreakResponse` directly to a `staff_schedule_blocks` row:
  - `phorest_id` = `breakId`
  - `block_date` = `breakDate`
  - `start_time` = `startTime`
  - `end_time` = `endTime`
  - `phorest_staff_id` = `staffId`
  - `label` = `label` (from API)
  - `block_type` = infer from label: if label contains "lunch" → `lunch`, else → `break`
  - `location_id` = `branchId`
  - `source` = `phorest`
  - `user_id` / `organization_id` = resolved from `phorest_staff_mapping`
- Upserts into `staff_schedule_blocks` on `phorest_id`

### 2. No other files change
The database table, hook, overlay component, and DayView/WeekView integrations are already built and correct. Once the edge function actually fetches data, it will flow through automatically.

## Technical Detail

```text
Current (broken):  /branch/{branchId}/roster?from_date=X&to_date=Y  → 404
Fixed:             /branch/{branchId}/break?from_date=X&to_date=Y&size=100&page=0  → 200
```

The Phorest break API has a max 1-month date range limit and 100-per-page pagination, both of which must be respected.

