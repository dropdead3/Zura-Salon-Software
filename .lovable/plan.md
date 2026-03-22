

## Fix Hamburger/Add Button Overlap + Relocate Add Button

**Problem:** The hamburger menu button (`top-5 right-5 z-40`) overlaps the add appointment button (`w-14 h-14`) in the header grid, both competing for the top-right corner.

### Changes

#### 1. `src/components/dock/schedule/DockScheduleTab.tsx`

**Remove add button from header** (lines 198-203): Delete the `+` button from the header grid. Simplify the grid back to a single-column layout since there's no second column needed.

**Add inline add button above the Active section** (inside the scroll area, before the first `AppointmentGroup`): Place a smaller, inline "Add Appointment" button row just above the first group:

```tsx
<button
  onClick={() => setShowNewBooking(true)}
  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600/15 text-violet-400 hover:bg-violet-600/25 transition-colors border border-violet-500/20"
>
  <Plus className="w-4 h-4" />
  <span className="font-display text-xs tracking-wide uppercase">Add Appointment</span>
</button>
```

This sits at the top of the scrollable content, clearly separated from the hamburger menu.

**Simplify header layout** (line 194): Revert to a simple flex column since the button is gone:

```tsx
<div className="px-5 pt-8 pb-5 border-b border-[hsl(var(--platform-border)/0.15)]">
  <h1 className="font-display text-3xl tracking-wide uppercase ...">Today's Appointments</h1>
  <p className="text-base ...">Sunday, March 22</p>
</div>
```

### UI Improvement Suggestions

- **Top fade overlay removal**: The `h-12` top gradient still partially covers the first section. With the add button now inline at the top of the scroll content, consider removing or reducing it.
- **Hamburger button position**: Could move to `top-8` to align better with the header title baseline.

### Summary

| File | Change |
|------|--------|
| `DockScheduleTab.tsx` | Remove add button from header grid, simplify header to flex column, add inline "Add Appointment" button above first appointment group in scroll area |

One file, three localized edits.

