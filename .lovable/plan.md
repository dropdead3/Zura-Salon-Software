

# Add Control Layer Hub Section

## File
`src/components/dashboard/backroom-settings/BackroomPaywall.tsx`

## Placement
Insert after Section 4.9 (Operational Intelligence Dashboard, ends at line 949) and before Section 5 (Pricing + ROI, line 951). New section number: 4.95.

## Structure

1. **Section header** (centered):
   - Headline: "The System That Connects Your Backroom"
   - Subtitle: "Zura Backroom links your services, formulas, inventory, and analytics into one connected system."

2. **Hub diagram** — CSS-based radial layout:
   - **Center**: A prominent circle with `Beaker` icon + "Zura Backroom" label, styled with `bg-primary/10 border-primary/30`
   - **7 surrounding nodes** positioned in a circular arrangement using absolute positioning on desktop, grid fallback on mobile:

| Node | Icon | Title | Description |
|------|------|-------|-------------|
| Appointments | `Calendar` | Appointments | Every service connects to tracked product usage. |
| Mix Sessions | `Beaker` | Mix Sessions | Every bowl mixed becomes recorded data. |
| Client Formulas | `Brain` | Client Formulas | Formulas are automatically stored for future visits. |
| Inventory | `PackageSearch` | Inventory Tracking | Product usage updates inventory instantly. |
| Assistants | `Users` | Assistant Workflows | Assistants can prep bowls with clear guidance. |
| Profitability | `DollarSign` | Service Profitability | Real product costs are tied directly to services. |
| Insights | `BarChart3` | Operational Insights | Backroom activity becomes measurable intelligence. |

3. **Desktop layout**: Relative container (~500px tall) with center hub and nodes positioned absolutely in a ring pattern. Thin SVG or CSS border lines connecting center to each node.

4. **Mobile layout**: Falls back to a simple grid (`grid-cols-2`) with the center hub spanning full width at top, and nodes below. No connecting lines on mobile.

5. **Node card styling**: Each node is a small card with icon circle (`w-10 h-10 rounded-full bg-muted`), title (`font-display text-xs tracking-wide`), and 1-line description (`font-sans text-[11px] text-muted-foreground`).

6. **Connecting lines**: Thin `border-border/30` lines using absolute-positioned divs or an SVG overlay connecting center to each node on `md:` and above. Hidden on mobile.

7. **Supporting message**: "Most tools track individual actions. Zura Backroom connects the entire workflow."

8. **CTA**: Centered `<ActivateButton />`

## New icon imports needed
Add `Calendar` to the lucide-react import (line 4-9).

## Section spacing
`pb-20 md:pb-24` consistent with other sections.

