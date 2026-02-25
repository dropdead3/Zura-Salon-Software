

## Amber Alert Color for Unsaved Changes Bar (Dark Mode)

### Change

**File: `src/pages/dashboard/MyProfile.tsx` (lines 1465-1466)**

Update the dot and text to use warning/amber semantic tokens:

- **Dot** (line 1465): Change `bg-primary` to `bg-warning` so it pulses amber instead of the primary brand color.
- **Text** (line 1466): Change `text-foreground` to `text-warning-foreground dark:text-warning` so the text reads amber in dark mode while remaining readable in light mode.

This uses the project's semantic `warning` token (amber-based per the color token system) rather than hardcoded Tailwind amber values.

### Files Changed

- `src/pages/dashboard/MyProfile.tsx` -- 2 class changes on lines 1465-1466

