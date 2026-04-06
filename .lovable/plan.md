

# Settings Page Card UI Cleanup

## Problem
The settings cards use per-category colored icons (each with a unique color like green, purple, orange, etc.), which creates visual noise and violates the design token system's monochrome icon standard (`bg-muted` box with `text-primary` icon). Cards also lack enforced equal height.

## Changes

**File:** `src/pages/dashboard/admin/Settings.tsx`

### 1. Monochrome icons (design token compliant)
- Replace the colored `style={{ backgroundColor: \`${iconColor}20\` }}` icon container with `tokens.card.iconBox` (bg-muted rounded-lg)
- Replace `style={{ color: iconColor }}` on the icon with `tokens.card.icon` (text-primary)
- This applies to the `SortableCard` component (lines ~220-225)

### 2. Equal card heights
- Add `h-full` to the Card inside SortableCard so all cards in a grid row stretch to the same height
- The flex-1/min-w-0 grid already handles column width; `h-full` on the card completes vertical alignment

### 3. Remove icon color customization UI
- Remove the color-picker Popover in edit mode (lines ~227-257) since icons are now monochrome
- Remove `onColorChange` prop from SortableCard
- Remove `PRESET_COLORS` constant, `localColors` state, `handleColorChange`, and color-related save/reset logic
- Keep drag-to-reorder functionality intact

### 4. Clean up unused exports
- Remove `DEFAULT_ICON_COLORS` usage from `useSettingsLayout.ts` imports (the layout save can still store order without colors)

**1 file changed. No database changes.**

