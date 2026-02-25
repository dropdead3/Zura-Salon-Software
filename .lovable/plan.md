

## Fix Editor Panel Padding and Tab Bar Overflow

The screenshot confirms two remaining issues: the tab bar ("Pending Requests", "Currently Visible", "Specialty Options") extends edge-to-edge with no breathing room, and the overall content still feels dense in the narrow editor panel.

### Root Causes

1. **TabsList overflow**: The three tab triggers contain long labels that fill the full width. The `TabsList` component renders `inline-flex` by default, so in a narrow panel (~400px after padding), the three triggers butt up against the container edges with no margin.

2. **Padding still tight at `p-3`**: On the narrowest breakpoint, `p-3` (12px) is not enough horizontal breathing room for cards and the tab bar. The tab bar visually touches the panel edge because the `TabsList` background extends to the padding boundary.

### Changes

**File: `src/components/dashboard/website-editor/StylistsContent.tsx`**

1. **Make TabsList full-width and scrollable** (line 402): Wrap the `TabsList` in a horizontal scroll container so on narrow panels the tabs don't crunch. Add `w-full` to `TabsList` and use smaller text on triggers at narrow widths. Alternatively, shorten the trigger labels at narrow widths — "Pending", "Visible", "Specialties" instead of the longer versions.

2. **Reduce trigger text length**: Change "Pending Requests" → "Pending", "Currently Visible" → "Visible", "Specialty Options" → "Specialties" — these are already contextually clear within the "Homepage Stylists" section. This alone solves the overflow without needing horizontal scroll.

3. **Tighten section header spacing** (lines 332-340): Reduce `space-y-6` to `space-y-4` on the root container so the gaps between the header, settings card, and tab bar are less cavernous in a narrow panel.

**File: `src/pages/dashboard/admin/WebsiteSectionsHub.tsx`**

4. **Bump minimum padding from `p-3` to `p-4`** (line 846): Change `p-3 sm:p-4 lg:p-6` to `p-4 sm:p-5 lg:p-6`. The extra 4px at the smallest breakpoint prevents the tab bar from visually touching the edges, while the `sm` breakpoint gets a slight bump too.

### Files Changed
- `src/components/dashboard/website-editor/StylistsContent.tsx` — shorter tab labels, tighter spacing
- `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` — bump minimum padding

