

## Problem

The CSS rule `scrollbar-width: thin !important` in the `.editor-preview` block (line 1542) reserves 6px of gutter space on the right and bottom edges for scrollbar tracks, even though the track and thumb are transparent. This creates visible gaps where the cream background shows through instead of the website content filling edge-to-edge.

## Plan

### 1. Change `scrollbar-width` from `thin` to `none` in editor-preview rules

In `src/index.css` lines 1538-1573, update the editor-preview scrollbar rules:

- Line 1542: Change `scrollbar-width: thin` to `scrollbar-width: none` — removes the gutter entirely
- Lines 1549-1550: Change webkit scrollbar `width: 6px` and `height: 6px` to `width: 0` and `height: 0` — removes webkit gutter
- Remove all hover-reveal rules (lines 1545-1547, 1567-1569) since there's no scrollbar to show

Scrolling still works with `scrollbar-width: none` — it just hides the scrollbar UI completely, which is the desired behavior for a scaled preview viewport.

**Resulting CSS:**
```css
.editor-preview,
.editor-preview body,
.editor-preview * {
  scrollbar-width: none !important;
  scrollbar-color: transparent transparent !important;
}
.editor-preview ::-webkit-scrollbar,
.editor-preview::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
  display: none !important;
}
.editor-preview ::-webkit-scrollbar-track,
.editor-preview::-webkit-scrollbar-track,
.editor-preview *::-webkit-scrollbar-track {
  background: transparent !important;
}
.editor-preview ::-webkit-scrollbar-thumb,
.editor-preview::-webkit-scrollbar-thumb {
  background: transparent !important;
}
.editor-preview ::-webkit-scrollbar-corner,
.editor-preview::-webkit-scrollbar-corner {
  background: transparent !important;
}
```

This eliminates the reserved scrollbar gutter space, allowing the iframe content to fill the entire bento box edge-to-edge.

