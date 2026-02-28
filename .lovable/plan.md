

## Problem

The `editorTokens.canvas.previewFrame` token applies `rounded-[24px]` to the iframe wrapper in all viewport modes, including desktop. This forces a bento-rounded shape on the website content itself. The outer canvas panel should keep its bento styling, but the preview iframe container should have no rounding in desktop mode so the website renders edge-to-edge.

## Fix — `src/components/dashboard/website-editor/panels/CanvasPanel.tsx`

1. Apply `editorTokens.canvas.previewFrame` only when **not** in desktop mode (mobile/tablet viewports where the bento frame makes visual sense).
2. In desktop mode, the iframe wrapper gets no rounding — just `overflow-hidden bg-background` so the website fills the full canvas area.

Single line change at line 194: conditionally apply the previewFrame token.

```tsx
// Before
editorTokens.canvas.previewFrame,

// After
isDesktop ? 'overflow-hidden bg-background' : editorTokens.canvas.previewFrame,
```

