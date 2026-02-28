

## Clean Up Collapsed State UI

### Problem
When groups are collapsed, the left menu has too much vertical whitespace — each collapsed header has generous padding, separators between homepage layout sub-groups remain visible even when both adjacent groups are collapsed, and the overall density is poor.

### Changes

**1. `src/components/dashboard/website-editor/SectionGroupHeader.tsx`**
- Reduce vertical padding on the collapsible button from `py-2 mt-4` to `py-1.5 mt-2` for tighter collapsed stacking
- Remove `first:mt-0` — use consistent small top margin instead
- Reduce `mb-1` to `mb-0.5` so expanded content sits closer to the header

**2. `src/components/dashboard/website-editor/panels/StructureLayersTab.tsx`**
- Conditionally hide the `<Separator>` between homepage layout sub-groups when **both** adjacent groups are collapsed (no children visible = no need for a divider)
- Reduce the heavy `border-t-2` divider between Content Managers and Homepage Layout from `my-3` to `my-2`
- Tighten the "Homepage Layout" label padding from `px-4 py-1` to `px-3 py-0.5`
- Reduce `mb-1` / `mb-2` on item containers to `mb-0.5` so collapsed-to-expanded transitions feel snug

### Result
Collapsed groups stack tightly with minimal gaps. Separators only appear when they separate visible content. The menu feels dense and scannable when collapsed.

