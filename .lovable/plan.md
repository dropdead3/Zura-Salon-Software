

## Location Toggle Pills for Products & Supplies

### Problem
The current location picker is a small dropdown that disappears when drilling into a brand. You need persistent, prominent location context so you always know which location's catalog you're configuring.

### Plan

**Replace the dropdown with toggle pill buttons** that remain visible at all times (both at the catalog level and inside brand detail views).

1. **Location toggle bar** — Render horizontally scrollable pill/chip buttons for each active location, placed prominently below the card header title area (above the stats cards). The active location gets a filled/highlighted style; others are outlined. Always visible regardless of whether a brand is selected.

2. **Persistent visibility** — Remove the `!selectedBrand` condition that currently hides the location picker when drilling into a brand. The user should always see which location they're editing.

3. **Active location indicator** — Show the selected location name in the card description, e.g. "Managing catalog for **North Mesa**" so it's immediately clear.

4. **Styling** — Use the existing dashboard theme (warm dark). Pills: `rounded-full px-4 py-1.5 text-xs font-medium` with `bg-foreground text-background` for active, `bg-muted/40 text-muted-foreground hover:bg-muted` for inactive. Include a small `MapPin` icon on the active pill.

### Files to Edit
- `src/components/dashboard/backroom-settings/BackroomProductCatalogSection.tsx` — Replace the `<Select>` location dropdown (lines 667-684) with a horizontal pill toggle bar rendered in a new row below the header, always visible. Update the card description to reflect the selected location name.

