

## Plan: Fix Invisible Inactive Options in Device Switcher

### Problem
The TogglePill's inactive options use `text-foreground/60` which resolves to near-invisible on the dark Dock background (`hsl(0 0% 14%)`). Only the selected option (white text on solid indicator) is visible.

### Fix
Override the inactive text color in `DockDeviceSwitcher.tsx` by passing a custom class that targets unselected buttons. Since the TogglePill doesn't expose an `inactiveClassName` prop, we have two options:

**Approach: CSS override on the container**
In `DockDeviceSwitcher.tsx`, extend the `className` on the TogglePill to include a descendant selector that brightens inactive button text:

Add a wrapper `<div>` with a utility class or use the existing className to apply `[&_button]:text-white/60` and `[&_button:hover]:text-white/80` — overriding the theme-relative `text-foreground/60` with absolute white-based opacity that's visible on the dark background.

### Changes

**`src/components/dock/DockDeviceSwitcher.tsx`**
- Update the TogglePill's `className` to add Tailwind arbitrary descendant selectors:
  - `[&_button]:text-white/60` for inactive buttons
  - `[&_button:hover]:text-white/80` for hover
  - The selected button's `text-background` class (higher specificity via the component's `cn()`) will still win for the active state

