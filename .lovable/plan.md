

## Problem

Sidebar nav link hover states use `hover:bg-muted/60` which is too subtle in light mode — the fill is barely visible against the light sidebar background.

## Plan

**File:** `src/components/dashboard/CollapsibleNavGroup.tsx`

Replace all instances of `hover:bg-muted/60` with `hover:bg-foreground/10` for non-active nav items. This uses a dark-on-light translucent overlay that provides visible contrast in light mode while remaining appropriate in dark mode (matching the memory note on button hover standards).

Affected hover classes (all non-active states):
- ~8 occurrences of `hover:bg-muted/60` → `hover:bg-foreground/10`

**File:** `src/components/dashboard/SidebarNavContent.tsx`

Same replacement for the main nav items and onboarding link:
- ~3 occurrences of `hover:bg-muted/60` → `hover:bg-foreground/10`

**File:** `src/components/dashboard/SidebarFeedbackButtons.tsx`

- 3 occurrences of `hover:bg-muted/60` → `hover:bg-foreground/10`

**File:** `src/components/dashboard/SidebarClockButton.tsx`

- 1 occurrence of `hover:bg-muted/60` → `hover:bg-foreground/10`

This aligns with the project's established hover standard: *"Ghost and Outline button variants must use a translucent `hover:bg-foreground/10` overlay rather than a solid light/accent background."*

