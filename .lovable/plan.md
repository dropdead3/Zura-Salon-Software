

# Update Badge Colors — Active (Ghost Green) & Inactive (Ghost Amber)

## Change

In `src/pages/dashboard/AppsMarketplace.tsx`, lines 201-211, replace the current `variant`-based badge styling with explicit ghost color classes:

- **Active badge**: Green ghost — `bg-emerald-500/15 text-emerald-400 border border-emerald-500/30`
- **Inactive badge**: Amber ghost — `bg-amber-500/15 text-amber-400 border border-amber-500/30`

Both badges keep `variant="outline"` as base and override with the color classes.

| File | Change |
|------|--------|
| `src/pages/dashboard/AppsMarketplace.tsx` (lines 201-211) | Replace badge variant/className with ghost green (active) and ghost amber (inactive) styling |

