

## Problem

The current glass scrollbar thumbs use only white (`rgba(255, 255, 255, 0.25)`), which is visible over dark sections but invisible over light/cream sections. The thumbs need to adapt — appearing darker over light content and lighter over dark content.

## Plan

### Update `src/index.css` lines 1567-1572

Use a dual-layer thumb with both a dark and light component, combined with a `mix-blend-mode` approach. The simplest effective technique: use a medium gray thumb color with high contrast via `background: rgba(128, 128, 128, 0.4)` and add a `backdrop-filter: contrast(0.85)` or use a `box-shadow` that provides both light and dark edges.

The most reliable cross-browser approach is a **neutral gray thumb with both an inner light and dark shadow**, creating a "pill" that reads on any background:

```css
.editor-preview *:hover::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.35) !important;
  box-shadow:
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.3),
    inset 0 0 4px rgba(0, 0, 0, 0.15) !important;
  backdrop-filter: blur(4px) !important;
}
.editor-preview *:hover::-webkit-scrollbar-thumb:hover {
  background: rgba(128, 128, 128, 0.5) !important;
}
```

Also update the Firefox `scrollbar-color` fallback on line 1547 from `rgba(255, 255, 255, 0.25)` to `rgba(128, 128, 128, 0.35)`.

The neutral gray base with the dual inset shadow (white inner border + dark inner glow) creates a frosted glass pill that contrasts against both light cream sections and dark sections. The `backdrop-filter: blur` adds the frosted glass depth.

