

# Stylist Headshot Photos in Revenue by Category Drilldown

## Problem
The stylist rows in the Revenue by Category drilldown use the generic `ZuraAvatar` (Zura Z icon) instead of actual stylist headshot photos. The `employee_profiles` table has a `photo_url` field that should be used.

## Approach

Thread `photo_url` from the staff resolver through to the UI component.

## Changes

### 1. `src/utils/resolveStaffNames.ts`
- Update `resolveStaffNamesByPhorestIds` to also select `photo_url` from the `employee_profiles` join
- Return `Record<string, { name: string; photoUrl: string | null }>` instead of `Record<string, string>` — or add a parallel map `Record<string, string | null>` for photos
- To avoid breaking all other consumers of this function, add a **new export** `resolveStaffWithPhotosByPhorestIds` that returns `Record<string, { name: string; photoUrl: string | null }>`

### 2. `src/hooks/useRevenueByCategoryDrilldown.ts`
- Import the new `resolveStaffWithPhotosByPhorestIds` instead of `resolveStaffNamesByPhorestIds`
- Add `photoUrl?: string | null` to `CategoryStylistData`
- Populate `photoUrl` from the resolver result when building stylist entries

### 3. `src/components/dashboard/sales/RevenueByCategoryPanel.tsx`
- In `StylistRow`, replace `<ZuraAvatar size="sm" />` with a proper `Avatar` + `AvatarImage` + `AvatarFallback` pattern (matching existing usage across the app)
- Show the headshot photo when `stylist.photoUrl` is available; fall back to initials

### Files Modified
| File | Change |
|---|---|
| `src/utils/resolveStaffNames.ts` | Add `resolveStaffWithPhotosByPhorestIds` that returns names + photo URLs |
| `src/hooks/useRevenueByCategoryDrilldown.ts` | Use new resolver, add `photoUrl` to `CategoryStylistData` |
| `src/components/dashboard/sales/RevenueByCategoryPanel.tsx` | Replace `ZuraAvatar` with `Avatar`/`AvatarImage`/`AvatarFallback` using `stylist.photoUrl` |

