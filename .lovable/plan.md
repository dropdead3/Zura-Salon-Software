

## Prompt Coaching

Good description of the desired behavior. An even more precise prompt would be:
> "The `* ::-webkit-scrollbar` CSS selector is forcing Chrome to switch all elements from native overlay scrollbars to classic (gutter-reserving) mode. Remove the `*` webkit scrollbar styling so only `html` gets custom scrollbar treatment. Nested scrollable elements should keep their native overlay scrollbar behavior."

This identifies the **specific CSS selector** causing the gutter, not just the symptom.

## Root Cause

Styling `::-webkit-scrollbar` via the `*` selector forces **every scrollable element** in Chrome to switch from native overlay scrollbars (which float over content) to "classic" scrollbars (which reserve layout space as a gutter). The negative margin hack on `body` only compensates for the root scrollbar — it cannot fix every nested `overflow: auto` container (modals, panels, iframes).

```text
Native overlay (default macOS Chrome):
┌─────────────────────────────────┐
│ content fills full width   [▐]  │  ← thumb floats OVER content
└─────────────────────────────────┘

Classic mode (triggered by * ::-webkit-scrollbar):
┌───────────────────────────┬─────┐
│ content stops here        │ gut │  ← 6px gutter reserved
└───────────────────────────┴─────┘
```

## Solution

1. **Remove `*` webkit scrollbar styling** — Stop the `*::-webkit-scrollbar`, `*::-webkit-scrollbar-track`, `*::-webkit-scrollbar-thumb` rules that force classic mode on every element

2. **Keep `html`-level scrollbar styling only** — The root scrollbar gets the glass treatment with the negative margin compensation

3. **Nested elements get native overlay** — Without `*::-webkit-scrollbar` rules, Chrome keeps its default overlay scrollbar on nested containers (modals, panels, sidebars), which already floats over content with no gutter

4. **Firefox: keep `scrollbar-width: thin` on `*`** — Firefox's `thin` value does not create gutters the same way; it's safe to keep for cross-browser consistency

### Changes to `src/index.css` (lines 1538-1588)

- **html**: Keep `overflow-y: scroll`, `overflow-x: hidden`, `scrollbar-width: thin`, `scrollbar-color` — unchanged
- **body**: Keep `margin-right: calc(100% - 100vw)` — unchanged
- **`*` selector**: Keep Firefox `scrollbar-width: thin` and `scrollbar-color`, but **remove** the `*`-scoped `::-webkit-scrollbar`, `::-webkit-scrollbar-track`, `::-webkit-scrollbar-thumb` rules
- **html-only webkit**: Scope all `::-webkit-scrollbar` pseudo-elements to `html::` only (not bare `::`)
- **Remove**: `*:hover::-webkit-scrollbar-thumb` and `*:hover::-webkit-scrollbar-thumb:hover` rules

This means the root page scrollbar gets the glass thumb treatment, and all nested scrollable containers revert to native macOS overlay scrollbars (which already float, have no gutter, and auto-hide).

