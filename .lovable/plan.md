

# Fix Flash of Unstyled Text (FOUT) — Font Loading Gate

## Problem

All 5 custom `@font-face` declarations (Termina, Aeonik Pro Regular/Medium, Laguna, Sloop Script) use `font-display: swap`. This tells the browser to immediately render text with fallback system fonts, then swap to the custom fonts once they load. The result: every page briefly flashes with generic sans-serif text before the platform fonts appear. This is unacceptable for a luxury/executive product.

## Root Cause

1. **`font-display: swap`** in `src/index.css` — renders fallback fonts immediately
2. **No font readiness gate** in the bootstrap flow — `main.tsx` renders `<App>` as soon as JS is ready, regardless of font loading status

## Solution

Two-layer fix: CSS-level blocking + JS-level gate.

### 1. Change `font-display` strategy (index.css)

Change `font-display: swap` to `font-display: block` on the two primary fonts (Termina and Aeonik Pro Regular/Medium). This tells the browser to use an invisible placeholder for up to 3 seconds while fonts load, preventing the fallback flash entirely.

For Laguna and Sloop Script (decorative, rarely in critical path), keep `font-display: swap` — they appear on limited surfaces and aren't worth blocking render for.

### 2. Add a font readiness gate to bootstrap (main.tsx)

Before rendering `<App>`, await `document.fonts.ready` with a timeout fallback (3 seconds max). The `BootstrapFallback` (ZuraLoader) is already rendered during this wait — it uses no text, just the animated Z grid, so it's immune to FOUT. This ensures the first real page render only happens after fonts are loaded.

```text
Bootstrap flow (current):
  render ZuraLoader → import i18n → import App → render App (fonts may not be ready)

Bootstrap flow (proposed):
  render ZuraLoader → import i18n → import App → await fonts.ready (max 3s) → render App
```

### 3. Preload critical fonts (index.html)

Add `<link rel="preload">` tags for the 3 critical font files in `<head>`. This starts the font download immediately — in parallel with JS — instead of waiting until CSS is parsed and a matching element is found.

```html
<link rel="preload" href="/fonts/Termina-Medium.otf" as="font" type="font/opentype" crossorigin />
<link rel="preload" href="/fonts/AeonikPro-Regular.otf" as="font" type="font/opentype" crossorigin />
<link rel="preload" href="/fonts/AeonikPro-Medium.otf" as="font" type="font/opentype" crossorigin />
```

## File Changes

| File | Action |
|------|--------|
| `src/index.css` | **Modify** — Change `font-display: swap` to `font-display: block` on Termina and both Aeonik Pro faces (lines 23, 39, 47) |
| `index.html` | **Modify** — Add 3 `<link rel="preload">` tags for critical fonts in `<head>` |
| `src/main.tsx` | **Modify** — Add `await document.fonts.ready` (with 3s timeout) before rendering `<App>` in the bootstrap function |

**0 new files, 3 modified files, 0 migrations.**

## Why This Works

- **Preload** starts font downloads immediately on page load (not deferred until CSS parse)
- **`font-display: block`** prevents fallback text from ever appearing — the browser waits (invisibly) for the font
- **JS gate** ensures React doesn't render the full app until fonts are confirmed loaded
- **ZuraLoader** (the bootstrap screen) is purely visual (animated grid cells) — no text, no font dependency — so it renders cleanly during the wait
- **3-second timeout** prevents infinite hang if a font fails to load — the app renders anyway after 3s

