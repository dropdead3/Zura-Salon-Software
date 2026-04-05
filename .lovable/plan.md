

# Stylist Levels Editor — Layout Redesign

## Problems

1. **3/5 column split is too cramped** — the left column (level cards) gets squeezed at 60%, making level names truncate ("Ne...", "Studio ...") and commission pills crowd the header row
2. **Right sidebar stacks too much** — Team Distribution, Progression Roadmap, and 3 Website Previews all stack vertically, creating a very long scroll with low-value content competing for attention
3. **Level cards are dense** — description input, commission fields, and criteria section are all crammed into each card with inconsistent spacing
4. **Website Previews are low-priority** — Card Preview, Services Dropdown, and Tooltip Preview take significant vertical space but are rarely useful during level configuration
5. **Team Commission Roster spans full width below** — disconnected from the level hierarchy it relates to

## Redesign Approach

### New Layout: Single-column primary with collapsible sidebar

Replace the `lg:grid-cols-5` split with a cleaner structure:

**Full-width level cards** — each level card gets the full content width, eliminating truncation. Cards use a horizontal layout:
- Left: reorder controls + level badge
- Center: name, description input, commission rates (inline row, not stacked), criteria summary
- Right: stylist count + edit/delete actions (always visible, not hover-only)

**Collapsible "Team & Previews" panel** — the Team Distribution, Progression Roadmap, and Website Previews move into a collapsible right panel using a `Sheet` or a toggle-able sidebar column (`lg:grid-cols-3` with `col-span-2` for levels). The panel defaults to collapsed in embedded (Settings) mode and open in standalone mode. This reclaims horizontal space for the cards.

**Alternatively (simpler):** Move to a **tabbed layout** within the editor:
- **Tab 1: "Levels"** — full-width level cards + Add Level button (the primary editing surface)
- **Tab 2: "Team Roster"** — the TeamCommissionRoster table
- **Tab 3: "Previews"** — Website Previews (Card, Dropdown, Tooltip) grouped together

This eliminates the cramped 2-column grid entirely.

### Specific UI Improvements

1. **Level cards — horizontal header row**: Level badge, name, commission pills, stylist count, and action buttons all on one row. No truncation because full width is available.

2. **Commission rates inline**: Show `Service 35% · Retail 10%` as text in the header row instead of tiny pills. Edit mode expands a row below with input fields.

3. **Criteria section cleaner**: The dashed CTA and configured summary remain but get more breathing room without the sidebar squeeze.

4. **Edit/delete always visible**: Remove `opacity-0 group-hover:opacity-100` — on touch devices these are undiscoverable. Show actions as subtle muted icons always.

5. **Tab navigation**: Use existing `Tabs` component with `tokens.tab` styling. Levels tab is default per tab rules.

6. **Responsive**: On mobile, tabs stack naturally. Level cards are already single-column. No 2-column grid to break.

## File Changes

| File | Action |
|------|--------|
| `src/components/dashboard/settings/StylistLevelsEditor.tsx` | **Modify** — Replace 2-column grid with tabbed layout (Levels / Team Roster / Previews), widen level cards to full width, make actions always visible, inline commission display |

**0 new files, 1 modified file, 0 migrations.**

## Technical Details

- Import `Tabs, TabsContent, TabsList, TabsTrigger` from `@/components/ui/tabs`
- Default tab value: `"levels"` (first tab, per tab rules)
- Remove `lg:grid-cols-5` grid wrapper
- Level cards: remove `pl-14` indentation on description/criteria (wasteful space with reorder buttons)
- Commission pills: increase from `text-[10px]` to `text-xs` for readability
- Action buttons: change from `opacity-0 group-hover:opacity-100` to `opacity-60 hover:opacity-100` (always visible but subtle)
- Website Previews tab groups all 3 previews with the level selector at the top
- TeamCommissionRoster moves from below the grid into its own tab

