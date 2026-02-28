

## Clean Up Collapsed State UI — Continued

### Issues Visible in Screenshot
1. **Alternating row tinting** — Some collapsed homepage layout groups (Social Proof, Conversion) have a subtle lighter background band, making it look striped/inconsistent.
2. **"HOMEPAGE LAYOUT" is a static label** — It sits as a plain non-interactive label while everything around it is collapsible. It should either be removed or styled as a distinct section divider.
3. **Redundant separator line** — The `border-t` divider between Content Managers and Homepage Layout adds clutter, especially when groups are collapsed.
4. **Collapsed headers have `border-b`** — Each collapsed group header renders its own bottom border, causing stacked horizontal lines when multiple groups are collapsed.
5. **ContentNavItem has generous padding** (`py-2.5`, `gap-3`, icon box with `p-1.5`) — compared to the collapsed headers, the expanded items feel oversized.

### Changes

**1. `SectionGroupHeader.tsx`**
- Remove `border-b border-border/30` from the collapsible button — the chevron + text is sufficient visual separation without stacked borders.
- Add a subtle `rounded-md` hover background instead of relying on bottom borders for grouping.

**2. `StructureLayersTab.tsx`**
- Replace the static "HOMEPAGE LAYOUT" `<div>` + `<span>` with a non-collapsible `SectionGroupHeader` using the existing non-collapsible variant, maintaining consistency.
- Remove the explicit `border-t` separator `<div>` between Content Managers and Homepage Layout — the group header itself provides enough visual break.
- Remove the conditional `<Separator>` logic between layout sub-groups — replace with consistent small spacing (`mt-0.5`) on each group wrapper, which works cleanly in both collapsed and expanded states.

**3. `ContentNavItem.tsx`**
- Reduce padding from `py-2.5` to `py-1.5` and gap from `gap-3` to `gap-2` for tighter density matching the rest of the menu.
- Reduce icon box padding from `p-1.5` to `p-1` for a more compact feel.

### Result
Collapsed groups stack cleanly without stacked borders or alternating tint bands. The menu feels uniform and dense in both states.

