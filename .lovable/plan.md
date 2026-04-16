

# Change Avatar Radius to 5px

## Change — `src/components/dashboard/schedule/DayView.tsx`

Replace `rounded-lg` (8px) with `rounded-[5px]` on all three instances added in the previous change:

1. **Avatar container** (line ~628): `rounded-lg` → `rounded-[5px]`
2. **AvatarImage** (line ~629): `rounded-lg` → `rounded-[5px]`
3. **AvatarFallback** (line ~630): `rounded-lg` → `rounded-[5px]`

Three class swaps, one file.

