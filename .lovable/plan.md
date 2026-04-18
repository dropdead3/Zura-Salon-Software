

## Diagnosis
The Tips card sits in the right sidebar column of `xl:grid-cols-3`. At viewport ≥1280px (`xl`), the global Tailwind `xl:inline` gate fires and shows "Average Tip Rate" — but the **card itself** is only ~440px wide, not 1280px. So the label overflows and overlaps the "TIPS" title (visible in screenshot as "TIP$verage Tip Rate 15.1%").

Viewport breakpoints are the wrong tool — the card's width is what matters, not the window's. The fix is **container queries**, which respond to the card's own width.

## Fix
Convert the Tips card header to container-query-aware:

1. Add `@container` to the `Card` (or `CardHeader`).
2. Replace `hidden md:inline xl:hidden` / `hidden xl:inline` with container-scoped variants:
   - `@[420px]:inline @[520px]:hidden` → "Avg. Rate"
   - `@[520px]:inline` → "Average Tip Rate"
   - Below 420px container width → both hidden, only "15.1%" + chevron remain.
3. Keep `whitespace-nowrap` so neither label wraps.
4. Keep tooltip `side="left"` and the current padding/icon sizing.

## Tailwind container query syntax
Tailwind v3 supports `@container` via the official `@tailwindcss/container-queries` plugin. Need to verify it's installed; if not, fall back to a CSS approach using `@container` directly in a small style block or use arbitrary `[@container]` syntax.

If the plugin is missing, install `@tailwindcss/container-queries` and add it to `tailwind.config.ts`. Then the classes `@container`, `@[420px]:inline`, `@[520px]:hidden`, `@[520px]:inline` work.

## Change

`src/components/dashboard/AggregateSalesCard.tsx` (~line 1541):

```tsx
<Card className="@container relative self-start bg-card/80 backdrop-blur-xl border-border/40">
  ...
  {!tipsCardExpanded && (
    <span className="flex items-center gap-2 text-sm min-w-0">
      <span className="font-sans text-muted-foreground hidden @[520px]:inline whitespace-nowrap">
        Average Tip Rate
      </span>
      <span className="font-sans text-muted-foreground hidden @[420px]:inline @[520px]:hidden whitespace-nowrap">
        Avg. Rate
      </span>
      <span className="font-display tabular-nums text-foreground">…%</span>
    </span>
  )}
```

Plus, if needed:
- Verify/install `@tailwindcss/container-queries` and register in `tailwind.config.ts`.

## Out of scope
- Other cards' label behavior
- Expand/collapse logic, value formatting, tooltip position
- Icon-box size, padding tokens

## Files
- **Modify**: `src/components/dashboard/AggregateSalesCard.tsx` — add `@container` to Tips Card, swap viewport breakpoints for container breakpoints on the rate labels.
- **Conditionally modify**: `tailwind.config.ts` + `package.json` — install container-queries plugin if not present.

