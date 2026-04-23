

# Step 7 (2B) — Skeleton shimmer

Upgrade the canonical `Skeleton` primitive from a binary opacity flash (`animate-pulse`) to a directional gradient sweep. This is a one-file change that ripples through every loading state in the app — KPIs, tables, cards, charts, drawers — without touching a single consumer.

## What's wrong today

`src/components/ui/skeleton.tsx` uses Tailwind's stock `animate-pulse`:

```
animate-pulse rounded-md bg-muted
```

`animate-pulse` strobes opacity 1 → 0.5 → 1. It reads as "broken / blinking," not "loading." Premium products (Linear, Vercel, Stripe) use a left-to-right gradient sweep over a static base — content feels like it's resolving, not flickering.

## The fix

Rewrite the `Skeleton` primitive to render a static muted base with a moving highlight gradient on top. The keyframe (`shimmer`) and easing already exist in `tailwind.config.ts` — we just stop using them at 3s/infinite for decorative things and apply a tighter 2s loop scoped to skeletons.

### New primitive

```tsx
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/60",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_1.8s_infinite]",
        "before:bg-gradient-to-r",
        "before:from-transparent before:via-foreground/[0.04] before:to-transparent",
        className
      )}
      {...props}
    />
  );
}
```

Key points:
- **Base stays static** at `bg-muted/60` — no opacity flicker.
- **`::before` pseudo-element** carries the moving highlight, so consumers' `className` overrides (heights, widths, rounded corners) still apply cleanly to the wrapper.
- **`overflow-hidden`** clips the sweep to the skeleton's shape.
- **Highlight is `foreground/4%`** — barely-there in light mode, just-visible in dark mode. Calm, not flashy.
- **1.8s loop** — fast enough to feel responsive, slow enough to not feel anxious.

### Tailwind keyframe adjustment

Current `shimmer` keyframe sweeps `200% → -200%` (right-to-left). For a `::before` element starting at `-translate-x-full`, we need it to travel left-to-right across the parent. Update the keyframe in `tailwind.config.ts`:

```ts
"shimmer": {
  "0%": { transform: "translateX(-100%)" },
  "100%": { transform: "translateX(100%)" },
},
```

This is a **breaking change** for any consumer using the old background-position-based `animate-shimmer` (badge sweeps, gradient overlays). Audit:

- `BellEntryCard.tsx` line 356 — Salon Lead badge uses `animate-shimmer` with `bg-[length:200%_100%]`. Needs to switch to a different keyframe to preserve its current effect.
- `CalendarColorPreview.tsx` line 184 — gradient overlay using `animate-shimmer`.
- `index.css` `.shimmer` and `.platform-animate-shimmer` classes — both use `background-position` and reference `@keyframes shimmer` defined in the CSS file (separate from Tailwind config), so they're insulated.

To avoid collateral damage, **add a new keyframe `skeleton-shimmer`** instead of mutating `shimmer`:

```ts
"skeleton-shimmer": {
  "0%": { transform: "translateX(-100%)" },
  "100%": { transform: "translateX(100%)" },
},
```

And reference it from the primitive: `before:animate-[skeleton-shimmer_1.8s_infinite]`.

The existing `animate-shimmer` (3s, background-position) stays untouched for the badge/gradient consumers.

## Files touched

1. **`tailwind.config.ts`** — add `skeleton-shimmer` keyframe (don't touch existing `shimmer`).
2. **`src/components/ui/skeleton.tsx`** — rewrite the primitive.

That's it. Every Skeleton consumer in the app (`ChartSkeleton`, KPI loading states, table loaders, drawer loaders, ~hundreds of usages) inherits the new look automatically.

## What stays untouched

- Existing `animate-shimmer` (badges, gradient overlays) — unchanged.
- `ChartSkeleton`, `NPSScoreCard`, `LocationStep`, `AccountIntegrationsCard`, etc. — they already use `<Skeleton />`; they get the new shimmer for free.
- Loader hierarchy (`BootLuxeLoader` / `DashboardLoader` / `Loader2`) — separate concern, no change.
- `tokens.loading.skeleton` design token — just the underlying primitive's animation changes.

## Acceptance

1. Any skeleton (KPI tile loading, table row loading, chart loading) now shows a subtle left-to-right sweep instead of a binary opacity strobe.
2. The Salon Lead badge and calendar gradient overlay still animate exactly as before.
3. In dark mode, the sweep is visible but not glaring; in light mode it's a quiet shimmer over the muted base.
4. Sweep loops every 1.8s, infinitely.

## Out of scope

- Replacing `Skeleton` with new dedicated variants (`SkeletonText`, `SkeletonAvatar`, etc.) — separate refinement pass.
- Touching `BootLuxeLoader` / `DashboardLoader` / page-level full-screen loaders.
- Reducing motion via `prefers-reduced-motion` — worth a future pass but not gated on this step.

