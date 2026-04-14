

## Problem

The "No terminal registered" label uses `text-muted-foreground/50` (50% opacity on an already muted color), making it nearly invisible in both dark and light mode.

## Solution

Increase the visibility of the "No terminal registered" text and its associated icon/location name while keeping it visually distinct from active locations.

### Changes

**File:** `src/components/dashboard/settings/terminal/SplashScreenUploader.tsx`

1. **Line 352** — Change `text-muted-foreground/50` to `text-muted-foreground` on the "No terminal registered" span. This uses the standard muted color without extra opacity reduction, ensuring readability in both themes.
2. **Line 345** — Change the icon opacity for no-terminal locations from `text-muted-foreground/40` to `text-muted-foreground/70`.
3. **Line 346** — Change the location name opacity from `text-muted-foreground/60` to `text-muted-foreground/80`.

These changes keep non-terminal locations visually secondary to active ones while ensuring all text remains legible.

