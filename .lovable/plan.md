

# Make Setup Wizard Banner More Urgent/Special

The current setup banner uses a subtle `border-primary/20` card with a muted sparkles icon. Based on the screenshot, it blends in with surrounding cards.

## Changes — `BackroomDashboardOverview.tsx` (lines 66-99)

Restyle the setup banner to use an amber/orange alert treatment:

- **Card**: Replace `border-primary/20` with `border-amber-500/40 bg-amber-500/5` for a warm urgent glow
- **Icon box**: Change from `bg-primary/15` + `text-primary` to `bg-amber-500/15` + `text-amber-500`
- **Progress bar**: Add `indicatorClassName="bg-amber-500"` so the bar matches the amber theme
- **Button**: Add `className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white border-0"` to make "Resume Setup" pop
- **Left accent**: Add a `border-l-2 border-l-amber-500` to the Card for a left-edge highlight strip
- **Collapsed warnings section**: Keep as-is (neutral), since the urgency is conveyed by the banner itself

Single file change, ~6 lines modified.

