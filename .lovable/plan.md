

## Glassify POS Sync Popover — True Transparent Blur

The popover currently uses `bg-card/80` which in dark mode (4% lightness card color) still reads nearly opaque. The screenshot confirms it lacks the see-through glass depth seen in the premium floating panels and appointment detail sheets.

### Changes (single file: `src/components/dashboard/PhorestSyncPopout.tsx`)

**1. PopoverContent — Deeper Transparency**
- Change `bg-card/80` → `bg-card/60` for more blur-through
- Add `backdrop-saturate-150` to match the top nav bar's glass treatment (see `DashboardLayout.tsx` line 1218)
- Increase shadow depth: `shadow-[0_8px_32px_rgba(0,0,0,0.12)]` → `shadow-[0_12px_40px_-8px_rgba(0,0,0,0.3)]` for more float
- Soften border further: `border-border/30` → `border-border/20`

**2. Inner Row Cards — Remove Opaque Stacking**
- Change `bg-card-inner/50` → `bg-card-inner/30` so inner rows don't fight the glass effect with additive opacity
- This maintains hierarchy without blocking the blur-through

**3. Header Divider — Even Softer**
- `border-border/20` → `border-border/15` for near-invisible structural separation

**4. Sync Now Button — Glass-Aware Contrast**
- Already using `bg-foreground text-background` which is correct for glass surfaces
- No change needed here

**5. Footer — Match Glass Depth**
- `border-border/10` stays — already properly subtle
- No change needed

### Visual Result
- Popover blurs through the dashboard content behind it (visible grid, cards)
- Saturated glass matches the top navigation bar's glass treatment
- Inner rows provide depth without blocking transparency
- Stronger shadow creates more physical "float" above the surface

### What Stays the Same
- All sync logic, queries, health calculation unchanged
- Layout structure, spacing, typography unchanged
- Button styling unchanged

