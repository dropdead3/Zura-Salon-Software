

# Match Operations Hub cards + dividers to Settings page

Two mismatches to fix on `/dashboard/admin/team-hub` so it visually equals `/dashboard/admin/settings`:

## Gap analysis

| Element | Settings page (target) | Operations Hub (current) |
|---|---|---|
| Card hover | `hover:border-primary/30 hover:shadow-md` (calm: tints border, soft shadow) | `hover:shadow-lg hover:-translate-y-1` (bouncy: lifts + heavy shadow) |
| Section divider | `border-b border-border/50 pb-2` **underline beneath the H2** (left-aligned, full width of header) | Centered 60% fade-out hairline **above** each section (`::before` gradient) |

## Changes

### 1. Card hover — adopt Settings treatment

In `src/pages/dashboard/admin/TeamHub.tsx`, three card components use the lift hover. Replace on each:

- `ManagementCard` (line 91)
- `HubGatewayCard` (line 137)
- `renderFavoriteCard` (line 290)

**From:** `group hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full border-border/50`

**To:** `group transition-all cursor-pointer h-full hover:border-primary/30 hover:shadow-md`

(Drops the `-translate-y-1` lift and the `shadow-lg`; adds `border-primary/30` tint and `shadow-md` to match Settings.)

The favorite card variant keeps its amber border/background; only the hover bits change.

### 2. Divider — adopt Settings underline pattern

Refactor `CategorySection` (line 170). Current implementation: centered `::before` fade above the section. Target: an underline directly beneath the H2 heading, matching Settings' `border-b border-border/50 pb-2`.

```tsx
function CategorySection({ title, children }: CategorySectionProps) {
  const validChildren = React.Children.toArray(children).filter(Boolean);
  if (validChildren.length === 0) return null;
  return (
    <section className="space-y-4">
      <h2 className="font-display text-xs uppercase tracking-widest text-muted-foreground border-b border-border/50 pb-2">
        {title}
      </h2>
      <div className="grid gap-3 items-stretch sm:grid-cols-2 lg:grid-cols-3">
        {validChildren}
      </div>
    </section>
  );
}
```

Outer page-level vertical rhythm shifts to `space-y-8` on the parent wrapper (matches Settings' `space-y-8` between section blocks).

### Files touched

- `src/pages/dashboard/admin/TeamHub.tsx` (only file)

### What stays untouched

- Card content, icon boxes, stat badges, favorite star button.
- Step 3 `Divider` primitive (`src/components/ui/Divider.tsx`) — still available for inside-card splits elsewhere; just not used by section breaks here.
- All other Step 1–3 work (elevation tokens, specular highlights).
- Settings page itself (it's the target; no changes there).

### Acceptance

1. Hovering an Operations Hub card tints its border violet and adds a soft shadow — no lift, no jump.
2. Each section heading sits above a thin underline that runs the full width of the grid, identical to Settings.
3. Side-by-side, both pages read as siblings.

### Out of scope

- Changing Settings to match OpsHub (going the other direction).
- Sweeping this card hover/divider style into Apps marketplace, Reports, or other card-grid pages (separate pass if desired).
- Touching the queued Step 4+ work.

