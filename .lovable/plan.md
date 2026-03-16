

# Add "Under the Hood" Section

## File
`src/components/dashboard/backroom-settings/BackroomPaywall.tsx`

## Placement
Insert after Section 4.95 (Control Layer Hub, ends at line 1072) and before Section 5 (Pricing + ROI, line 1074). New section number: 4.97.

## Structure

1. **Section header** (centered):
   - Headline: "How Zura Backroom Works"
   - Subtitle: "Every bowl mixed becomes structured data that powers your salon's operations."

2. **Horizontal step flow** — 6 steps in a `grid-cols-2 sm:grid-cols-3 md:grid-cols-6` grid (same pattern as the existing "See It In Action" workflow section):

| Step | Icon | Title | Description |
|------|------|-------|-------------|
| 1 | `Scale` | Mix Bowl on Scale | Stylists mix as normal while the scale measures product usage. |
| 2 | `Zap` | Usage Captured | The system records exactly how much product is used. |
| 3 | `Brain` | Formula Saved | The formula is automatically stored for the client's next visit. |
| 4 | `PackageSearch` | Inventory Updated | Product usage instantly updates your backroom inventory. |
| 5 | `DollarSign` | Cost Calculated | The true product cost of the service becomes visible. |
| 6 | `BarChart3` | Insights Generated | Your backroom data powers analytics for the salon. |

3. **Step styling**: Each step is a centered card with step number in `text-primary/20 font-display text-3xl`, icon in `w-12 h-12 rounded-xl bg-muted`, title in `font-display text-xs tracking-wide`, and description in `font-sans text-xs text-muted-foreground font-light`. Desktop gets `ChevronRight` connectors between columns (hidden on mobile).

4. **Supporting message**: "Zura Backroom quietly captures the data behind every service so your salon can operate with clarity."

5. **CTA**: Centered `<ActivateButton />`

## Note on differentiation from "See It In Action"
This section emphasizes the *data pipeline* (what happens to information) rather than the *user workflow* (what the stylist does). The descriptions focus on system behavior and data flow. Visual treatment mirrors the same grid pattern for consistency but uses different copy and framing.

## No new imports needed
All icons (`Scale`, `Zap`, `Brain`, `PackageSearch`, `DollarSign`, `BarChart3`, `ChevronRight`) are already imported.

