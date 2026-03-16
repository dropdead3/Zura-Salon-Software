

# Add Operational Intelligence Dashboard Section

## File
`src/components/dashboard/backroom-settings/BackroomPaywall.tsx`

## Placement
After **Section 4.85 (See It In Action)** (line 759) and before **Section 5 (Pricing + ROI)** (line 761). New section number: 4.9.

## Structure

1. **Section header** (centered):
   - Headline: "Turn Your Backroom Into Business Intelligence"
   - Subtitle: "Zura Backroom transforms product usage into real operational insights for your salon."

2. **Dashboard mock grid** — `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6` with 6 insight cards:

| Card | Icon | Title | Description | Mini Visual |
|------|------|-------|-------------|-------------|
| 1 | `BarChart3` | Product Usage Trends | See exactly how much color your salon uses each week. | 3 ascending bars (Tailwind divs) |
| 2 | `Droplets` | Chemical Waste Visibility | Identify where product is being wasted and reduce unnecessary cost. | Small percentage badge "12% waste" |
| 3 | `DollarSign` | Service Profitability | Understand the true product cost behind every service. | Two-line mock: revenue vs cost |
| 4 | `AlertTriangle` | Inventory Risk Alerts | Know before you run out of critical supplies. | Status dot + "3 items low" |
| 5 | `Users` | Staff Usage Patterns | See which team members use product most efficiently. | Mini ranking: 1st, 2nd, 3rd pills |
| 6 | `Brain` | Top Formulas | Your salon's most-used formulas, ranked and ready. | "127 mixes" badge |

Each card:
- `bg-card border-border/50 shadow-sm hover-lift rounded-xl`
- `p-6 md:p-8`
- Icon in `w-11 h-11 rounded-xl bg-muted` box
- Title: `font-display text-sm tracking-wide`
- Description: `font-sans text-sm text-muted-foreground font-light`
- Mini visual: small Tailwind-only element below the description to simulate a dashboard widget (bars, badges, dots — no charts library needed)

3. **Supporting message** (centered, below grid):
   - "Most salons operate the backroom on guesswork. Zura Backroom turns it into a measurable system."

4. **CTA**: Centered `<ActivateButton />`

## Visual approach for mini dashboard elements
Each card gets a tiny decorative element built with Tailwind divs to simulate analytics — e.g., three colored bars of different heights for "trends," a small pill badge for "waste %," colored dots for alerts. These are purely decorative, not data-driven. This makes the section feel like a real dashboard preview without needing recharts or actual data.

## Styling
- Section spacing: `pb-20 md:pb-24` (matches page rhythm)
- Header to grid: `space-y-8 md:space-y-10`
- All existing icons are already imported — no new imports needed

