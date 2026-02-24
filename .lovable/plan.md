

## Add Subtle Separator Stroke Above Sidebar Footer

### What Changes

A subtle top border will be added to the footer container in the sidebar to visually separate the bottom action items (Beta badge, Feedback, Clock In, Lock) from the scrollable navigation links above them.

### Technical Detail

**File: `src/components/dashboard/SidebarNavContent.tsx`** -- line 732

Add `border-t border-border/40 pt-2` to the footer container's className to create a thin, subtle separator line consistent with the existing border styling used elsewhere in the sidebar (e.g., `border-border/30` on the header, `border-border/50` on the footer cards).

```
// Current (line 732):
<div className="mt-auto shrink-0 flex flex-col gap-2">

// Updated:
<div className="mt-auto shrink-0 flex flex-col gap-2 border-t border-border/40 pt-2">
```

One line changed. The opacity (`/40`) sits between the header border (`/30`) and the card borders (`/50`) for a subtle but visible stroke.

