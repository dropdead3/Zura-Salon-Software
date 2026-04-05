

# Bottom Sticky CTA — Centered Pill

## Change

Replace the full-width bottom bar with a centered floating pill, matching the top nav's glass morphism style.

### Current
Full-width bar: `fixed bottom-0 left-0 right-0` with `border-t`

### New
- Centered pill: `fixed bottom-4 left-1/2 -translate-x-1/2`
- `rounded-full` with `border border-white/[0.08]` (no `border-t`)
- `bg-white/[0.06] backdrop-blur-xl shadow-lg shadow-black/20`
- Inner content stays the same (text + CTA button) in a compact horizontal layout
- `w-auto` / `max-w-2xl` so it hugs content

## File Changes

| File | Action |
|------|--------|
| `src/components/marketing/MarketingNav.tsx` | **Modify** lines 182-196 — change bottom bar container from full-width to centered pill |

**1 file modified.**

