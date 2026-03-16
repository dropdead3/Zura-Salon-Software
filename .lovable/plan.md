

# Add ROI Proof + "See It In Action" Workflow Sections

## Two new sections for BackroomPaywall.tsx

### 1. ROI Proof Section — "Zura Backroom Pays for Itself"

**Placement**: After Section 4.5 (Competitor Comparison, line 670) and before Section 5 (Pricing, line 675).

**Structure**:
- Section heading: "Zura Backroom Pays for Itself"
- Subtitle: "Most salons don't know the real cost of their color services. Zura Backroom makes it visible."
- 3-column card grid (`grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6`):

| Card | Icon | Title | Copy |
|------|------|-------|------|
| 1 | `Droplets` | Recover Product Waste | If your salon performs 200 color services per month and reduces waste by just $2 per service, that's $400 recovered every month. |
| 2 | `DollarSign` | Know Real Service Costs | Knowing the true product cost of every service helps you price correctly and protect margins. |
| 3 | `TrendingUp` | Protect Service Margins | When you see exactly where product goes, you stop losing money on services you thought were profitable. |

- Cards: `bg-card border-border/50 shadow-sm hover-lift`, `p-6 md:p-8`, icon box `w-11 h-11 rounded-xl bg-muted`
- Subtle CTA below: `<ActivateButton />`

### 2. "See It In Action" Workflow Section

**Placement**: After the ROI Proof section, still before Pricing.

**Structure**:
- Section heading: "See Zura Backroom In Action"
- Subtitle: "From mixing the bowl to tracking inventory, every step is connected."
- 6-step horizontal flow (`grid-cols-2 sm:grid-cols-3 md:grid-cols-6`) that stacks responsively:

| Step | Icon | Label |
|------|------|-------|
| 1 | `Scissors` (from iconResolver) | Start the service |
| 2 | `Scale` | Mix the bowl on the scale |
| 3 | `Zap` | Usage tracked automatically |
| 4 | `Brain` | Formula saved for the client |
| 5 | `PackageSearch` | Inventory updates instantly |
| 6 | `BarChart3` | Service cost becomes visible |

- Each step: centered card with icon circle, step number (`text-primary/20 font-display`), and short label
- On desktop, faint connecting lines between steps using pseudo-elements or `ChevronRight` icons between grid cells
- On mobile: 2-col grid, clean stacking

### Files modified
- `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` — insert both sections between competitor comparison and pricing

### Icons needed (already imported)
All icons (`Droplets`, `DollarSign`, `TrendingUp`, `Scale`, `Zap`, `Brain`, `PackageSearch`, `BarChart3`) are already imported. Add `Scissors` to the import.

