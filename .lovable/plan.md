

## Problem

`overflow: overlay` is **deprecated and removed** in Chrome 114+ (June 2023). It now behaves identically to `overflow: auto`, which **reserves space** for the scrollbar — creating the visible gutter strip the user sees on the right edge of the public website and modals.

No amount of transparent background styling fixes this because the gutter is structural (layout space), not visual (paint).

## Solution

Use the well-known **negative margin hack** to pull content under the scrollbar gutter, combined with transparent track/thumb styling.

### How it works

```text
┌──────────────────────────┬──┐
│ viewport (100vw)         │SB│  ← SB = scrollbar (6px)
│                          │  │
│ body width = 100%        │  │  ← 100% = viewport minus scrollbar
│ margin-right = -6px      │→→│  ← negative margin extends body UNDER scrollbar
│ content now fills 100vw  │  │
└──────────────────────────┴──┘
   html: overflow-x: hidden clips any overflow
```

`calc(100% - 100vw)` automatically equals the negative scrollbar width (because `100vw` includes scrollbar, `100%` doesn't).

### Changes to `src/index.css` (lines 1538-1581)

Replace the current global scrollbar block with:

1. **html**: `overflow-y: scroll; overflow-x: hidden` — always show scrollbar zone but clip horizontal overflow
2. **body**: `margin-right: calc(100% - 100vw)` — extend body under the scrollbar gutter so content fills full viewport
3. **`::-webkit-scrollbar`**: Keep at 6px width, transparent background
4. **`::-webkit-scrollbar-track`**: Transparent
5. **`::-webkit-scrollbar-thumb`**: Transparent by default, adaptive glass gray on hover with the dual box-shadow treatment
6. **Firefox fallback**: `scrollbar-width: thin; scrollbar-color: transparent transparent` (Firefox's `thin` scrollbar is already overlay-like on most OS configurations)
7. Remove the deprecated `overflow: overlay` declarations entirely

For **nested scrollable elements** (modals, dialogs, scroll containers): The `*` selector rules for `::-webkit-scrollbar` and `scrollbar-width: thin` continue to handle these — they make inner scrollbars thin and transparent, which is sufficient because inner scroll containers don't have the same full-viewport gutter problem.

### No changes needed to Layout.tsx or any other files

The `editor-preview` class can remain for any future editor-specific behavior but is no longer the gate for scrollbar styling.

