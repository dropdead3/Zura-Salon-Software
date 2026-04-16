

# Surface Stylist Level, Booking Status & Lead Pool Eligibility in Scheduler Headers

## Problem
The scheduler column headers only show stylist name and utilization %. Front desk staff need to see at a glance:
1. **Stylist level** (e.g., "L2", "L3") — already stored in `employee_profiles.stylist_level`
2. **Accepting new clients** — `employee_profiles.is_booking` already exists in the schema
3. **Lead pool eligible** — no column exists yet; needs a new DB field and a place to configure it

## Data availability

| Signal | DB column | Exists? |
|--------|-----------|---------|
| Stylist level | `employee_profiles.stylist_level` | Yes |
| Accepting new clients | `employee_profiles.is_booking` | Yes |
| Lead pool eligible | — | **No — needs migration** |

## Plan

### 1. Migration — Add `lead_pool_eligible` to `employee_profiles`
```sql
ALTER TABLE public.employee_profiles
  ADD COLUMN lead_pool_eligible boolean NOT NULL DEFAULT true;
```
Default `true` so existing stylists are opted in. Admins can toggle individual stylists off.

### 2. Expand schedule staff query (`Schedule.tsx`)
Update the `employee_profiles` select (line 328) to also fetch `stylist_level`, `is_booking`, `lead_pool_eligible`. Pass these through the stylist objects to `DayView`.

### 3. Expand `DayView` stylist type & header UI
Extend the `stylists` array type to include `stylist_level`, `is_booking`, `lead_pool_eligible`.

Update the header cell (lines 490-513) to show:
- **Level badge** — small pill next to the name using `getLevelColor` from `@/lib/level-colors.ts`, showing the level label (e.g., "L2"). Requires joining `stylist_level` slug to `stylist_levels` table for the label — we'll use `useStylistLevels()` in DayView or pass levels down.
- **Accepting new clients indicator** — small green dot or "Booking" / "Not Booking" subtle text
- **Lead pool indicator** — small icon (e.g., `UserPlus`) or dot showing lead pool eligibility

Layout per header cell:
```text
┌──────────────────────────┐
│ [Avatar]  Trinity Graves  │
│           L2 · 72% booked│
│           ● Booking  ⟡ LP│
└──────────────────────────┘
```
- `● Booking` = green dot + "Booking" when `is_booking`; red dot + "Not Booking" when false
- `⟡ LP` = `UserPlus` icon, visible only when `lead_pool_eligible` is true, with tooltip "Lead Pool Eligible"

### 4. User settings — Lead pool toggle
Add the `lead_pool_eligible` toggle to the existing staff/user profile settings page (wherever `is_booking` is managed), so admins can configure per-stylist lead pool eligibility alongside their booking status.

### Files to modify
- **Migration**: new SQL adding `lead_pool_eligible` column
- `src/pages/dashboard/Schedule.tsx` — expand select query + stylist type
- `src/components/dashboard/schedule/DayView.tsx` — expand props type + header UI
- Staff settings component (where `is_booking` toggle lives) — add `lead_pool_eligible` toggle

### Technical notes
- `stylist_level` is a slug string (e.g., `"level-2"`). To show a human label like "L2", we either pass the `stylist_levels` list into DayView or use `useStylistLevels()` directly inside DayView and build a slug→label map.
- Color coding uses existing `getLevelColor(index, totalLevels)` from `@/lib/level-colors.ts`.
- No new dependencies required.

