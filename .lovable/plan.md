

## Goal
Replace the busy "disco Z" grid as the dominant loader with a calmer, luxury composition: a small static Z mark with a thin animated bar underneath. Keep it theme-aware and consistent across light/dark.

## Investigation
Let me confirm what's available before designing.
<lov-tool-use id="toolu_vrtx_01JZtUrYjJgFe9oFxh9K2VF7" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/ui/loaders/BarLoader.tsx\"}">
</lov-tool-use>
<lov-plan>

## Goal
Introduce a calmer, more luxurious default loader: a small static `ZuraZIcon` with a thin animated progress bar underneath. Replace the "disco Z" shimmer grid as the dominant section/page loader. Keep it strictly theme-aware (light + dark) and respect the operator's branding choice.

## Design

```text
        ┌───┐
        │ Z │     ← ZuraZIcon, ~20px, text-foreground/80
        └───┘
   ━━━━━━━━━━━━   ← 1px-tall bar, indeterminate slide
   (subtle, brand-quiet)
```

- Z mark: existing `ZuraZIcon` (pixel Z, vector) — static, no shimmer
- Bar: ~96px wide, 1px tall, `bg-foreground/10` track, `bg-foreground/50` indicator sliding left→right on a 1.4s ease-in-out loop
- Vertical gap: 12px between Z and bar
- Centered, no card chrome
- Optional caption slot (e.g. "Loading schedule…") in `font-sans text-xs text-muted-foreground` — off by default

This replaces visual *motion density* (49 pulsing cells) with *intentional cadence* (one icon, one quiet line). Reads as luxury rather than tech-demo.

## New component

**`src/components/ui/loaders/LuxeLoader.tsx`** — small composition: `ZuraZIcon` over a re-tuned bar.

| Size | Z icon | Bar width | Bar height | Use case |
|---|---|---|---|---|
| `sm` | 16px | 64px | 1px | Inline / tight cards |
| `md` | 20px | 96px | 1px | Section / card loads (new default) |
| `lg` | 28px | 128px | 1.5px | Full-page route loads |
| `xl` | 40px | 176px | 2px | Bootstrap / brand moments |

Theme-aware via `text-foreground` + `bg-foreground/X` tokens — no hardcoded colors, works in light and dark identically.

## Wiring

**`src/hooks/useLoaderConfig.ts`** — extend `LoaderStyle` union:
```ts
export type LoaderStyle = 'luxe' | 'zura' | 'spinner' | 'dots' | 'bar';
```
Default fallback in the hook flips from `'zura'` → `'luxe'`.

**`src/components/dashboard/DashboardLoader.tsx`** — add `luxe: LuxeLoader` to `LOADER_MAP`. Default branding fallback becomes `LuxeLoader`. ZuraLoader stays available as an opt-in style for operators who prefer it.

**`main.tsx` bootstrap fallback** — keep `ZuraLoader size="xl" platformColors`. Bootstrap is a brand moment; the disco Z earns its place there. Section/page loads get the new luxe treatment.

**Platform branding picker** (where loader style is chosen) — surface "Luxe" as the new default option above "Zura". One-line label addition; no new UI surface needed.

## Out of scope
- Removing `ZuraLoader` (kept as an opt-in style + bootstrap moment)
- Changing the bootstrap/brand-moment loader
- Skeleton mode (already handled separately in `DashboardLoader`)
- Caption text wiring across call sites (slot exists; adoption is per-page later)

## Files to create
1. `src/components/ui/loaders/LuxeLoader.tsx`

## Files to modify
1. `src/hooks/useLoaderConfig.ts` — add `'luxe'` to union, default to `'luxe'`
2. `src/components/dashboard/DashboardLoader.tsx` — register `LuxeLoader` in map, default fallback
3. Platform branding picker UI (TBD via search — likely `src/components/platform/branding/*`) — add "Luxe" option, mark as default

## Verification signal
- Section loads (Schedule, Analytics, Reports) show the small Z + thin sliding bar — calm, executive, brand-present without dominating
- Dark + light modes render identically (no color drift, no flash)
- Bootstrap still shows the full disco Z xl moment — brand intact at app entry
- Operators who explicitly chose "Zura" loader in branding settings still get it (no forced override)

