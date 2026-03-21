

## Tighten Numpad Spacing and Enlarge Buttons

**File:** `src/components/dock/DockPinGate.tsx`

**Changes:**

1. **Reduce grid gap** (line 134): Change `gap-4` to `gap-3` to bring buttons closer together.

2. **Increase button size**: Change `h-16` to `h-[72px]` on both digit buttons (line 153) and the delete button (line 142) for a larger tap target. Widen the grid from `w-72` to `w-80` so the wider buttons have room.

3. **Bump text size**: Change `text-xl` to `text-2xl` on digit buttons to match the larger button size.

All changes are in a single file, lines 134–158.

