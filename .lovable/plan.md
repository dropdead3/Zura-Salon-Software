

## Inline Assistant Selection & Filter by Stylist Role

### Changes — single file: `src/components/dock/schedule/DockNewBookingSheet.tsx`

**1. Filter team members to stylists only** (~line 156-162)
- Join against `user_roles` to only include users with `role = 'stylist'`. Since the Supabase JS client can't join across tables easily here, add a secondary query to fetch `user_roles` with `role = 'stylist'` for the org, then filter the employee list against those user_ids.

**2. Make assistant chips inline, not collapsible below** (~lines 947-986)
- Remove the `showAssistantPicker` toggle state and the separate collapsible `<div>` below the stylist row.
- Instead, render the assistant chip buttons directly inside the right side of the stylist row (same flex line), replacing the "+ Add Assistant" button text with the actual selectable chips inline.
- Layout: Stylist info on the left, chip buttons flowing on the right (using `flex flex-wrap gap-1.5 justify-end`).

### Layout
```text
│ 👤 Stylist        [Alexis R.] [✓Kylie M.] [Sam T.]  │
│    Demo Mode                                          │
```

Each chip is tappable to toggle selection (violet highlight when selected, subtle bg when not) — same styling as current chips, just positioned inline on the right of the row instead of in a separate collapsible section below.

