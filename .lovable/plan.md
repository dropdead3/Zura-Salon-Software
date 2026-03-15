

# Apple-Level Responsive Product Row Polish

Looking at the screenshot and current code, the product rows have layout issues at various widths — the controls overlap product info, the "No cost" badge crowds the depletion select, and the mobile stacking lacks breathing room. Here's the plan:

## Changes — `BackroomProductCatalogSection.tsx`, `ProductRow` component (lines 810–892)

### 1. Three-zone layout with clean breakpoints
Restructure the row into three distinct zones that reflow gracefully:

```text
Desktop (sm+):
┌──────────────────────────────────────────────────────────────┐
│  [Toggle] [ⓘ]  Product Name · Brand        [Controls ────→] │
│                 Category · SKU · No cost                     │
└──────────────────────────────────────────────────────────────┘

Mobile (<sm):
┌──────────────────────────────────┐
│  [Toggle] [ⓘ]  Product Name     │
│                 Brand · Category │
│  ┌────────────────────────────┐  │
│  │ [Depletion] │ Bill │ Over  │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

### 2. Specific improvements

- **Product info zone**: `flex-1 min-w-0` with `truncate` on name. Brand moves inline with name on desktop, wraps below on mobile.
- **Controls zone**: `shrink-0 ml-auto` on desktop. On mobile, full-width with `flex-wrap` so Billable/Overage pair wraps cleanly if needed.
- **Padding & gaps**: Increase to `p-4` with `gap-4` for more breathing room. Use `transition-all duration-200` for smooth state changes when toggling tracking on/off.
- **Hover state**: Add subtle `hover:border-border/80 hover:shadow-sm` transition (120ms) for a premium interactive feel.
- **"No cost" badge**: Move it inline with the category badge row, add slight `gap-1.5` so it doesn't crowd the depletion selector.
- **Controls container**: Use `rounded-lg bg-muted/30 backdrop-blur-sm` with consistent inner padding `px-3 py-2.5`. The divider between depletion and switches becomes `h-4` for better proportion.
- **Select trigger**: Fixed width `w-[130px]` on desktop to prevent layout shift between "Weighed" and "Per Service" labels.
- **Switch labels**: Bump from `text-[10px]` to `text-[11px]` for legibility without changing density.

### 3. Motion
- Row appears/disappears with `transition-all duration-200 ease-out` on border and background color when tracking is toggled.
- No spring or bounce effects (per motion standards).

## Files impacted
- `src/components/dashboard/backroom-settings/BackroomProductCatalogSection.tsx` — `ProductRow` component only (lines 810–892)

