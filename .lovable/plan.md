

## Per-Location Timezone Support

### Problem
The current timezone setting is org-wide. Organizations with locations in different timezones (e.g., Arizona + California) need each location to have its own timezone. The scheduler should use the selected location's timezone.

### Architecture: Location → Org Fallback

```text
Scheduler selects location
  → locations.timezone (if set)
  → organizations.settings.defaults.timezone (org default)
  → 'America/New_York' (hardcoded fallback)
```

This follows the existing Location → Org fallback pattern used by kiosk settings, Color Bar settings, and social links.

### Changes

**1. Migration: Add `timezone` column to `locations`**
```sql
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS timezone text;
```
Nullable — `NULL` means "inherit from org default." No data migration needed; existing locations will naturally fall back.

**2. Update `useOrgNow` hook to accept an optional `locationTimezone` override**
- New signature: `useOrgNow(locationTimezone?: string | null)`
- If `locationTimezone` is provided and non-null, use it instead of org default
- Minimal change — just one parameter added

**3. New hook: `useLocationTimezone(locationId?: string)`**
- Queries `locations.timezone` for the selected location
- Returns the location's timezone if set, otherwise `null` (letting `useOrgNow` fall back to org default)
- Consumers: Schedule components that already have `selectedLocationId`

**4. Update Schedule components**
- In the main schedule page/container where `locationId` is known, call `useLocationTimezone(locationId)` and pass the result to `useOrgNow(locationTimezone)`
- Affects: `ScheduleHeader`, `DayView`, `WeekView`, `MonthView`, `AgendaView`, `ShiftScheduleView`, `ScheduleActionBar` — but most will get the timezone via props or the existing `useOrgNow` call already in their tree

**5. Update Regional Settings Card (System Settings)**
- Transform from org-only to per-location:
  - Add a location selector dropdown at the top (using existing `LocationSelect` component)
  - "All Locations" = org default timezone
  - Specific location = that location's override (or inherited value shown as placeholder)
  - When a specific location is selected, save to `locations.timezone`
  - When "All Locations" is selected, save to `organizations.settings.defaults.timezone` (existing behavior)
  - Show "(inherited from org)" indicator when a location has no override

**6. Update `useUpdateTimezone` hook**
- Add a `locationId` parameter
- If `locationId` is provided: update `locations.timezone` for that location
- If no `locationId`: update `organizations.settings.defaults.timezone` (existing behavior)

### Files

| File | Action |
|------|--------|
| Migration (new) | Add `timezone` column to `locations` |
| `src/hooks/useLocationTimezone.ts` | New — query location timezone |
| `src/hooks/useOrgNow.ts` | Add optional timezone override param |
| `src/hooks/useTimezoneSettings.ts` | Add location-level save support |
| `src/components/dashboard/settings/SettingsCategoryDetail.tsx` | Add location selector to Regional card |
| Schedule components (6 files) | Pass location timezone through to `useOrgNow` |

### Data Flow
```text
Regional Settings Card:
  [Location Selector] → [Timezone Dropdown] → Save
    ├─ "All Locations" → writes org.settings.defaults.timezone
    └─ Specific location → writes locations.timezone

Scheduler:
  selectedLocationId → useLocationTimezone(id) → timezone string
    → useOrgNow(locationTimezone) → todayStr, nowMinutes, isToday, etc.
```

### Scope
- 1 migration (add column)
- 2 new files (useLocationTimezone hook)
- 4-5 edited files (useOrgNow, useTimezoneSettings, SettingsCategoryDetail, schedule container)

