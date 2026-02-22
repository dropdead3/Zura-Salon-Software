

# Tokenize Scrollbar Styling

## Overview

Extract the scrollbar animation and color values from the Radix `ScrollArea` component into the design token system, and align the native CSS scrollbar utilities (`scrollbar-minimal`, `scrollbar-thin`, global `*::-webkit-scrollbar`) to use the same color/size values -- creating one source of truth.

## Changes

### 1. Add `scrollbar` token group to `src/lib/design-tokens.ts`

New token group capturing all scrollbar styling:

```text
tokens.scrollbar.track       -- "flex touch-none select-none opacity-0 transition-opacity duration-700 ease-in-out group-hover/scroll:opacity-100"
tokens.scrollbar.trackV      -- "h-full w-2 p-[1px]"
tokens.scrollbar.trackH      -- "h-2 flex-col p-[1px]"
tokens.scrollbar.thumb       -- "relative flex-1 rounded-full bg-muted-foreground/25 hover:bg-muted-foreground/40"
```

Also export CSS-level constants for the native scrollbar rules:

```text
SCROLLBAR_COLOR_IDLE    = "transparent"
SCROLLBAR_COLOR_HOVER   = "hsl(var(--muted-foreground) / 0.25)"
SCROLLBAR_COLOR_ACTIVE  = "hsl(var(--muted-foreground) / 0.4)"
SCROLLBAR_WIDTH         = "8px"
SCROLLBAR_WIDTH_THIN    = "6px"
SCROLLBAR_WIDTH_MINIMAL = "4px"
```

These CSS constants are documentation-only (CSS cannot import JS tokens), but they anchor the single source of truth in one file so any future change is coordinated.

### 2. Update `src/components/ui/scroll-area.tsx`

Import `tokens` and replace inline class strings with token references:

- `ScrollAreaScrollbar` className uses `tokens.scrollbar.track` + orientation-specific token
- `ScrollAreaThumb` className uses `tokens.scrollbar.thumb`

### 3. Update `src/index.css` native scrollbar rules

Align all three native scrollbar sections to use the same color values (`--muted-foreground` at 0.25 / 0.40 / 0.50 opacities) and add `transition: background 0.3s ease` on thumb pseudo-elements where WebKit supports it. This gives native scrollbars a softer reveal that approximates the Radix opacity animation.

Specific CSS additions on the global `*::-webkit-scrollbar-thumb`:
```css
transition: background 0.3s ease;
```

### 4. Update `getTokenFor` helper

Add `'scrollbar-track'` and `'scrollbar-thumb'` context keys to the helper function.

## Files Modified

| File | Change |
|------|--------|
| `src/lib/design-tokens.ts` | Add `scrollbar` token group + CSS constant comments |
| `src/components/ui/scroll-area.tsx` | Import tokens, replace inline classes |
| `src/index.css` | Add `transition` to global webkit thumb rule |

