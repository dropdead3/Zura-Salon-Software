

## Differentiate "Homepage Layout" Label

### Problem
The non-collapsible "Homepage Layout" label uses the same `text-muted-foreground/70` color as the collapsible group headers, making it blend in rather than serve as a distinct section divider.

### Changes

**`src/components/dashboard/website-editor/SectionGroupHeader.tsx`** (non-collapsible variant, lines 34-40)
- Change text color from `text-muted-foreground/70` to full `text-muted-foreground` — removes the 70% opacity so it reads stronger than the collapsible sub-group headers
- Add `mt-3` (up from `mt-1`) to give it more breathing room above, visually separating it as a parent section label rather than a peer of the collapsible groups

No other files need changes.

