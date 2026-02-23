
## Fix Select Dropdown Arrow Centering

### Problem
The chevron arrow inside `SelectTrigger` has an extra `mr-2` (margin-right) on line 27 of `src/components/ui/select.tsx`. Combined with the trigger's own `px-4` padding, this creates asymmetric spacing -- the arrow sits too far from the right edge of the container.

### Fix
Remove `mr-2` from the `ChevronDown` icon in `src/components/ui/select.tsx`.

**Before:**
```tsx
<ChevronDown className="h-4 w-4 opacity-50 mr-2" />
```

**After:**
```tsx
<ChevronDown className="h-4 w-4 opacity-50" />
```

### Impact
This is a global change to the `SelectTrigger` component, so all select dropdowns across the platform will benefit from balanced arrow spacing. Since the container already applies `px-4` on both sides, removing the icon's extra margin restores visual symmetry.

### Files Changed
- `src/components/ui/select.tsx` (line 27 only)
