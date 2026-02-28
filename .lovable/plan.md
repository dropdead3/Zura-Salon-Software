

## Problem

`scrollbar-width: thin` reserves a 6px gutter that pushes content inward. The glass thumbs need to float **over** the content with no reserved space — an overlay scrollbar.

## Plan

### Update `src/index.css` lines 1538-1576

Two changes:

1. **Add `overflow: overlay`** to scrollable containers — this is the WebKit/Blink property that renders scrollbars on top of content with zero gutter. Falls back gracefully to `auto`.
2. **Keep `scrollbar-width: thin`** for Firefox (Firefox doesn't support overlay, but `thin` is the thinnest option and the least intrusive gutter).

```css
/* ===== EDITOR PREVIEW — Glass overlay scroll thumbs on hover ===== */
.editor-preview,
.editor-preview body,
.editor-preview * {
  scrollbar-width: thin !important;
  scrollbar-color: transparent transparent !important;
  overflow: overlay !important;
}
.editor-preview *:hover {
  scrollbar-color: rgba(255, 255, 255, 0.25) transparent !important;
}

.editor-preview ::-webkit-scrollbar,
.editor-preview::-webkit-scrollbar {
  width: 6px !important;
  height: 6px !important;
  background: transparent !important;
}
.editor-preview ::-webkit-scrollbar-track,
.editor-preview::-webkit-scrollbar-track,
.editor-preview *::-webkit-scrollbar-track {
  background: transparent !important;
}
.editor-preview ::-webkit-scrollbar-thumb,
.editor-preview::-webkit-scrollbar-thumb {
  background: transparent !important;
  border-radius: 3px !important;
  transition: background 0.2s ease !important;
}
.editor-preview *:hover::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.25) !important;
  box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.15) !important;
}
.editor-preview *:hover::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.4) !important;
}
.editor-preview ::-webkit-scrollbar-corner,
.editor-preview::-webkit-scrollbar-corner {
  background: transparent !important;
}
```

The key addition is `overflow: overlay !important` on all editor-preview elements. This tells WebKit/Blink to render the scrollbar as a floating overlay on top of content rather than reserving gutter space. The glass thumbs will appear directly over the page content on hover.

Note: `overflow: overlay` is deprecated in spec but remains fully functional in Chrome/Safari (the browsers used for this preview). Elements that don't scroll will simply ignore the property.

