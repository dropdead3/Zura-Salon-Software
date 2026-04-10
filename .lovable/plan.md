

# Remove Growth Hub & Color Bar Hub from Operations Hub

## Changes

### 1. `src/pages/dashboard/admin/TeamHub.tsx`
- **Remove Growth Hub card** (lines 227-232)
- **Remove Color Bar Hub conditional block** (lines 265-272)
- **Remove unused imports**: `Rocket`, `Beaker` from lucide-react; `useColorBarEntitlement` hook
- **Remove unused variable**: `isColorBarEntitled` (line 154)

### 2. `src/utils/guidanceRoutes.ts`
- Remove `/dashboard/admin/growth-hub` from `VALID_ROUTE_PREFIXES` (line 48)

### 3. `src/components/dashboard/settings/SidebarPreview.tsx`
- Remove the `/dashboard/admin/growth-hub` route label entry (line 26)

### Not touched (intentionally)
- `GrowthHub.tsx` page and its route in `App.tsx` — kept to avoid breaking bookmarks
- `pageExplainers.ts` growth-hub entry — harmless, stays for now

