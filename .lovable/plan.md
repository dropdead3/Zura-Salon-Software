

# Interactive Feature Reveal Section

## Concept
A split-layout section where users click/tap through 5 feature tabs on the left, and the right side shows a corresponding mock UI visualization for each feature. This replaces static feature cards with an engaging, interactive experience.

## Placement
Insert as **Section 4.25** — after "What You Get" (Section 4, line 664) and before "Competitor Comparison" (Section 4.5, line 666). This positions the interactive reveal immediately after users see the feature list, deepening their understanding with visual demonstrations.

## File
`src/components/dashboard/backroom-settings/BackroomPaywall.tsx`

## Structure

### Layout
- **Desktop**: Two-column split (`grid-cols-1 lg:grid-cols-2`). Left = feature list, Right = visualization panel.
- **Mobile**: Stacked — feature buttons as horizontal scrollable pills, visualization below.

### Left Side — Feature Selector
5 clickable feature items. The active one is highlighted with `bg-primary/5 border-primary/20`. Each shows icon, title, and 1-line description.

| Key | Icon | Title | Description |
|-----|------|-------|-------------|
| mixing | `Scale` | Smart Mixing | The scale captures every gram while stylists mix normally. |
| formulas | `Brain` | Formula Memory | Formulas are saved automatically to the client profile. |
| inventory | `PackageSearch` | Inventory Intelligence | Every bowl updates product inventory in real time. |
| profitability | `DollarSign` | Service Profitability | Product costs are connected directly to each service. |
| insights | `BarChart3` | Operational Insights | Backroom activity becomes measurable salon intelligence. |

### Right Side — Visualization Panel
A `Card` with `min-h-[320px]` containing a **static mock UI** for each feature, rendered with existing UI primitives (no images/videos). Content transitions with a subtle `animate-fade-in` on change.

**Mock visualizations** (built with Card, badges, muted containers):

1. **Smart Mixing**: Mock scale readout showing product name, grams dispensed, and a progress bar toward target weight.
2. **Formula Memory**: Mock client card with name, last visit date, and 3 formula lines (product + weight).
3. **Inventory Intelligence**: 3-row mini table showing product, current stock, and a colored status badge (Good/Low/Critical).
4. **Service Profitability**: Mock service card with revenue, product cost, and margin percentage.
5. **Operational Insights**: 3 mini stat cards (bowls mixed, avg waste, top product) in a grid.

### Interaction
- `useState` to track `activeFeature` (default: `'mixing'`).
- Clicking a feature item updates state; visualization panel re-renders with `key={activeFeature}` to trigger the `animate-fade-in` class.
- No scroll-based triggers — keeps it simple and performant.

### Header
- Headline: "Explore Zura Backroom"
- Subtitle: "Click each feature to see how it works inside your salon."

### New imports needed
None — all icons already imported, all UI components already used.

### Performance
- Zero external assets. All visualizations are lightweight JSX with Tailwind classes.
- Single `useState` — no effects, no intersection observers.

