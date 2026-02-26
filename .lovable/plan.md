

## Fix Website Locations Inspector Overflow

### Problem

The address text (e.g., "3641 E Baseline Rd Suite Q-103, Gilbert, AZ 85234") is still running off the panel edge. The `truncate` class on the `<p>` flex containers doesn't propagate truncation to child text -- in a flex layout, `truncate` on the parent doesn't constrain children without explicit `min-w-0` + `overflow-hidden` on the flex container chain.

### Changes

**`src/components/dashboard/website-editor/LocationsContent.tsx`**

1. **Address/phone/hours rows**: Each `<p>` is a flex row with an icon + text. Add `min-w-0 overflow-hidden` to each `<p>` and ensure the text `<span>` has `truncate`. For phone (line 189-191), wrap the text in a `<span className="truncate">` as well.

2. **Location name + badge row** (line 170): The `flex-wrap` causes the badge to drop below on narrow panels. Change to `overflow-hidden` with `truncate` on the name so it clips instead of wrapping, keeping the badge inline.

3. **Parent `space-y-0.5` div** (line 184): Add `min-w-0 overflow-hidden` to ensure the detail block respects the card boundary.

### Specific Edits

| Line(s) | Current | Fix |
|---------|---------|-----|
| 170 | `flex items-center gap-1.5 mb-1 flex-wrap` | `flex items-center gap-1.5 mb-1 min-w-0` (remove flex-wrap, add min-w-0) |
| 184 | `space-y-0.5 text-xs text-muted-foreground` | `space-y-0.5 text-xs text-muted-foreground min-w-0 overflow-hidden` |
| 185 | `flex items-center gap-1.5 truncate` | `flex items-center gap-1.5 min-w-0` (move truncate to inner span) |
| 189-191 | Phone text is bare | Wrap in `<span className="truncate">` |
| 193 | `flex items-center gap-1.5 truncate` | `flex items-center gap-1.5 min-w-0` (truncate already on inner span) |

### Result
All text lines clip cleanly within the inspector panel. No horizontal overflow on addresses, phone numbers, or hours.

