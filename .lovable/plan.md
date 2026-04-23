

# Step 3 follow-up — Apply Divider system to Operations Hub

The Divider primitives shipped in Step 3 (`<Divider variant="hairline" />` and `<Divider variant="inset" />`), but the Operations Hub at `/dashboard/admin/team-hub` wasn't swept to use them. This applies the dividers where they belong.

## Scope

Audit `team-hub` page and its section components. Place dividers at two intentional break points:

- **`inset`** between top-level page sections (Today's Operations → Quick Actions → Categories → etc.) — gives editorial breathing room.
- **`hairline`** inside multi-section cards that currently butt content against borders (header/body splits, sub-section breaks).

## Plan

1. Open `src/pages/dashboard/admin/team-hub.tsx` (or equivalent Operations Hub page) to map the section sequence.
2. Insert `<Divider variant="inset" />` between top-level sections.
3. Identify any internal card splits (e.g. `OperationsQuickStats` header-to-grid, category groups) and add `<Divider variant="hairline" />` where the current treatment is a bare `border-b` or no separation.
4. Import `Divider` from `@/components/ui/Divider` in each touched file.

## Files expected to touch

- `src/pages/dashboard/admin/team-hub.tsx` (page-level inset dividers)
- 1–2 section components if internal hairlines are warranted (will confirm during build)

## What stays untouched

- All other Steps 1, 2 work (elevation, specular highlights, primitive itself).
- Dashboard home, schedule, analytics — Operations Hub only this pass.
- Card structure, data, layout grid.

## Acceptance

1. Walking down `/dashboard/admin/team-hub` shows clear, intentional breaks between top-level sections via the centered fade-out divider.
2. No section feels jammed against the next.
3. Hairline dividers (if added) read as quiet internal splits, not heavy borders.

## Out of scope

- Sweeping dividers into other dashboard pages (separate pass if you want it).
- Restyling the divider itself (already shipped in Step 3).
- Touching Step 4+ (tabular numerics is next in the sequence).

