

## Problem

The editor-preview scrollbar CSS (lines 1538-1568 in `index.css`) forces scrollbar thumbs to be **always visible** at `rgba(0, 0, 0, 0.18)` — both in the default state and on hover. This creates persistent dark scrollbar handles visible against the light website content in the preview viewport.

The correct behavior per design tokens: **no scrollbar backgrounds anywhere, thumbs only appear on hover/mouse motion**.

## Plan

### 1. Fix editor-preview scrollbar rules in `src/index.css`

**Lines 1538-1568** — Change the editor-preview scrollbar rules to match the hover-only pattern:

- **Default state** (lines 1539-1545): Change `scrollbar-color` from `rgba(0, 0, 0, 0.18) transparent` to `transparent transparent` — thumbs invisible by default
- **Hover state**: Add a separate hover rule that reveals the thumb on hover only
- **Webkit thumb** (lines 1560-1564): Change default thumb from `rgba(0, 0, 0, 0.18)` to `transparent` — invisible by default
- **Webkit thumb hover**: Add hover-reveal rule for webkit thumbs within editor-preview

Resulting CSS:

```css
/* Default: all transparent */
.editor-preview,
.editor-preview body,
.editor-preview * {
  scrollbar-width: thin !important;
  scrollbar-color: transparent transparent !important;
}

/* Hover: reveal thumb only */
.editor-preview *:hover {
  scrollbar-color: rgba(0, 0, 0, 0.15) transparent !important;
}

/* Webkit: thumb transparent by default */
.editor-preview ::-webkit-scrollbar-thumb,
.editor-preview::-webkit-scrollbar-thumb {
  background: transparent !important;
  border-radius: 3px !important;
}

/* Webkit: thumb visible on hover */
.editor-preview *:hover::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15) !important;
}
```

The track, corner, and scrollbar base rules remain unchanged (already transparent).

