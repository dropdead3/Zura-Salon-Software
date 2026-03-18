

## Replace Location Toggle Pills with Scrollable Dropdown

### Change

Replace the toggle pill buttons (lines 726-749) with a `Select` dropdown using the existing `Select`/`SelectContent`/`SelectItem` components from `@/components/ui/select`. The dropdown content already supports scrolling natively via Radix's `ScrollUpButton`/`ScrollDownButton` and `max-h-96` overflow.

### Implementation

**File:** `src/components/dashboard/backroom-settings/BackroomProductCatalogSection.tsx`

- **Delete** lines 726-749 (the pill toggle block)
- **Replace** with a `Select` dropdown in the same location (`px-6 pb-2`):
  - Trigger shows `MapPin` icon + selected location name
  - Trigger styled with `w-fit rounded-full` to keep it compact
  - Each `SelectItem` renders the location name
  - `onValueChange` calls `setSelectedLocationId`
  - Value bound to `effectiveLocationId`
  - Only rendered when `activeLocations.length > 1`

