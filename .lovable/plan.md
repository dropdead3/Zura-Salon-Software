

## Redesign DockWeightInput Numpad Layout

### Problem
The numpad buttons are too squished — small `h-14` height, tight `gap-2`, and narrow `max-w-[280px]`. The Confirm button text/icon lack proper internal spacing. Overall the component feels cramped for gloved-hand salon use.

### Changes — `src/components/dock/mixing/DockWeightInput.tsx`

1. **Increase numpad button size**: `h-14` → `h-16`, `rounded-xl` → `rounded-2xl`
2. **Widen grid**: `max-w-[280px]` → `max-w-[320px]`, `gap-2` → `gap-3`
3. **Bump font size**: `text-lg` → `text-xl` on numpad keys
4. **Action buttons**: `h-12` → `h-14`, `rounded-xl` → `rounded-2xl`, `gap-3` → `gap-4` between them
5. **Confirm button padding**: Add explicit `px-6` and increase icon/text `gap-2` → `gap-2.5`
6. **Display value**: Increase from `text-4xl` → `text-5xl` for better readability
7. **Spacing**: `mb-6` after display → `mb-8`, `mt-4` before action buttons → `mt-6`
8. **Delete icon**: `w-5 h-5` → `w-6 h-6`

### Result
Larger touch targets, more breathing room between elements, and properly padded button labels — optimized for iPad/tablet backroom use with gloves.

