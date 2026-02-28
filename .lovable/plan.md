

## Analysis

The scrollbar you see is **inside the iframe** — it's the website's own root scrollbar. Here's why it's still showing as a classic gutter:

In WebKit/Chrome, the moment you style `::-webkit-scrollbar` on any element (even `html`), that element permanently switches from native overlay scrollbars to "classic" mode, which reserves layout space (the gutter). Our current CSS does this:

```css
html::-webkit-scrollbar { width: 6px; background: transparent; }
```

This makes the track *visually* transparent, but the 6px gutter is still **structurally reserved**. The `body { margin-right: calc(100% - 100vw) }` hack compensates by extending the body under it — but inside the iframe, this creates a visible strip because the iframe container clips at its boundary.

The dark appearance comes from the page content rendering behind the transparent track in a region where the iframe's clipping boundary meets the canvas background.

## Solution

**Remove all WebKit scrollbar pseudo-element styling entirely.** On macOS Chrome, native overlay scrollbars already float over content with no gutter — they only appear when scrolling and auto-hide. By removing our `::-webkit-scrollbar` rules, we stop forcing Chrome into classic mode.

### Changes to `src/index.css` (lines 1538–1584)

Replace the entire scrollbar block with:

1. **Remove** `html { overflow-y: scroll }` — this forces a permanent scrollbar; let the browser decide
2. **Keep** `html { overflow-x: hidden }` — prevents horizontal scroll from the negative margin
3. **Remove** `body { margin-right: calc(100% - 100vw) }` — no longer needed since native overlay scrollbars don't create gutters
4. **Remove** all `html::-webkit-scrollbar*` rules — these are what force classic gutter mode
5. **Keep** Firefox `scrollbar-width: thin` + `scrollbar-color` on `*` — Firefox handles this correctly without creating gutters

Final CSS:

```css
html {
  overflow-x: hidden;
}

/* Firefox: thin scrollbar on all elements (does not create gutters) */
* {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
*:hover {
  scrollbar-color: rgba(128, 128, 128, 0.35) transparent;
}
```

This is the minimal approach: let the OS handle scrollbar rendering natively (floating overlay on macOS, thin overlay on Windows 11), and only customize Firefox's colors. No gutters anywhere — root page, iframes, modals, all clean.

### Risk

On Windows with "always show scrollbars" enabled, users will see the OS default scrollbar (not our glass treatment). This is acceptable because Windows scrollbars in that mode are expected behavior and don't create the jarring dark gutter strip. If custom styling for Windows is desired later, it can be added as a separate enhancement.

