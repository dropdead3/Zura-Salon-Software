

# Fix FounderQuote — Dark Theme + Light Blue Highlights

## Problem

The FounderQuote section uses a light cream background (`bg-[#FAF9F7]`) with `text-slate-900` and amber highlights — completely out of place on the dark cinematic marketing surface.

## Changes

### `src/components/marketing/FounderQuote.tsx`

- **Background**: Remove `bg-[#FAF9F7]`, use transparent (inherits the dark marketing surface background)
- **Quote text**: Change `text-slate-900` to `text-white` / `text-white/90`
- **Highlights**: Replace `bg-amber-100/60` with `bg-[hsl(var(--mkt-lavender)/0.15)]` (light blue from the marketing palette) and add `text-[hsl(var(--mkt-lavender))]` for the text color inside highlights
- **Photo placeholder**: Update from `from-slate-200 to-slate-300` gradient to a dark glass style: `bg-white/[0.05] border border-white/[0.08]` with `text-white/20` initials
- **Attribution**: `text-slate-900` → `text-white/90`, `text-slate-500` → `text-white/50`, `text-slate-400` → `text-white/30`
- **Quote font**: Keep `font-display` with existing sizes — consistent with the screenshot reference

## File Changes

| File | Action |
|------|--------|
| `src/components/marketing/FounderQuote.tsx` | **Modify** — dark theme colors, lavender highlights, glass photo placeholder |

**1 file modified.**

