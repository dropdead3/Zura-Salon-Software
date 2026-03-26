

## Increase Text Size for Vessel Selection Area

### Change
Bump all text in the vessel selection row from tiny sizes (`text-[9px]`, `text-[10px]`) to readable sizes, and increase icon sizes to match.

### Technical Detail

**File: `ServiceTrackingSection.tsx`** (lines 706–733)

| Element | Current | New |
|---------|---------|-----|
| "Vessels:" label | `text-[10px]` | `text-xs` (12px) |
| "and/or" separator | `text-[9px]` | `text-xs` |
| Chip button text | `text-[10px]`, `px-2.5 py-0.5` | `text-xs`, `px-3 py-1` |
| Chip icons | `w-2.5 h-2.5` | `w-3 h-3` |

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`

