

## Plan: Glass Scroll Thumbs for Editor Preview

### Changes to `src/index.css` (lines 1538-1563)

Replace the current hidden-scrollbar rules with a glass-thumb-on-hover pattern:

- **Default state**: `scrollbar-width: thin`, thumbs fully transparent (no gutter gap since thumb is invisible)
- **Hover state**: Thumb reveals as a frosted glass pill — `rgba(255, 255, 255, 0.25)` with a subtle `rgba(255, 255, 255, 0.1)` border effect via `box-shadow`
- **Active/drag state**: Slightly more opaque `rgba(255, 255, 255, 0.4)`
- **Track**: Always transparent — no background reserved
- **Webkit scrollbar width**: 6px thin overlay style

```css
/* ===== EDITOR PREVIEW — Glass scroll thumbs on hover ===== */
.editor-preview,
.editor-preview body,
.editor-preview * {
  scrollbar-width: thin !important;
  scrollbar-color: transparent transparent !important;
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

This gives a luxury frosted-glass scrollbar thumb that only materializes on hover, with no visible track or gutter when idle.

