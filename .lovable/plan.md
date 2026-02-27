

## Refine Specialty Options Manager for Inspector Panel

**Problem**: The two-row stacked layout is functional but visually heavy -- each item takes too much vertical space with the controls on a separate row, creating a long, clunky list.

### Design

Consolidate back to a **single-row layout** but optimized for narrow panels:

- **Compact single row**: Grip handle + truncated name on the left, mini icon buttons on the right
- **Smaller controls**: Use `h-7 w-7` icon buttons instead of full `Button` components for edit/delete
- **Smaller switch**: Scale down the switch with a wrapper class
- **Tighter padding**: `px-2.5 py-2` instead of `p-3`
- **Reduced gap**: `gap-1.5` between elements
- **Actions on hover** (desktop): Edit and delete buttons show only on hover to reduce visual noise, switch always visible
- **Name styling**: Smaller text (`text-xs`), truncated, with subtle opacity for inactive items

### Implementation

**File: `src/components/dashboard/SpecialtyOptionsManager.tsx`** (lines 87-172)

Restructure `SortableSpecialtyItem` render:

```
[grip] [name···············] [✏️] [⬤] [🗑️]
```

Single row with:
- Grip: `w-3.5 h-3.5` icon, minimal padding
- Name: `flex-1 min-w-0 truncate text-xs`
- Edit + Delete: `h-6 w-6` ghost icon buttons, `opacity-0 group-hover:opacity-100` transition
- Switch: always visible, slightly scaled down
- Container: `group` class for hover reveal, `px-2.5 py-1.5`, `rounded-md` (tighter than `rounded-lg`)
- Edit mode: Input replaces entire row content after grip handle

