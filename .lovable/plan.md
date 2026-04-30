## Problem

In the Website Editor (`/admin/website-hub?tab=editor`), the left rail and live preview panels visibly clip off the bottom of the viewport, and content bleeds slightly past the left/right edges. Sidebar headers (e.g. "Extensions Spotlight") also appear cut at the top.

## Root cause

`src/components/dashboard/website-editor/WebsiteEditorShell.tsx` line 1136 — the root wrapper is:

```tsx
<div className="-mx-1 h-full min-h-[calc(100vh-2rem)] flex flex-col gap-3 p-3">
```

The parent in `WebsiteHub.tsx` is already `h-screen w-full overflow-hidden`, so:

1. **`min-h-[calc(100vh-2rem)]`** — overrides `h-full` and forces the shell to be `100vh - 32px`. But the shell sits *inside* `p-3` of itself (12px top + 12px bottom = 24px) and the parent is exactly `100vh`. The `min-h` is bigger than the available content area, so the toolbar pushes the flex children (sidebar + preview) past the bottom edge. Result: bottom edges of both panels are cut off.
2. **`-mx-1`** — pulls the shell 4px wider than its parent on each side, causing the right edge of the preview frame to clip.
3. The `p-3` (12px) padding is asymmetric in feel because the parent has no padding — combined with the negative margin, it reads as inconsistent gutters.

## Fix

Single-line change to the shell root container:

```tsx
// Before
<div className="-mx-1 h-full min-h-[calc(100vh-2rem)] flex flex-col gap-3 p-3">

// After
<div className="h-full w-full flex flex-col gap-3 p-3 overflow-hidden">
```

- Drop `-mx-1` → removes horizontal bleed.
- Drop `min-h-[calc(100vh-2rem)]` → let `h-full` from the `h-screen` parent govern height, so the flex column fits exactly within the viewport.
- Add `overflow-hidden` → defensively contain any child that briefly mis-sizes during resize, instead of pushing the page scrollbar.
- Keep `p-3` → preserves the 12px breathing room around the toolbar/panels (matches the existing visual rhythm).

The inner row at line 1293 already uses `flex-1 min-h-0 overflow-hidden`, and both the sidebar (`h-full flex flex-col`) and preview (`flex flex-col h-full`) panels already manage their own internal scroll, so no child changes are needed — the sidebar's clipped "Extensions Spotlight" header will resolve once the rail is no longer pushed below the fold.

## Files

- `src/components/dashboard/website-editor/WebsiteEditorShell.tsx` — line 1136 only.

## Verification

After the change, at 1281×851 (current viewport):

- Toolbar, left rail, and live preview frame all fit within the viewport with consistent 12px gutters on all four sides.
- No page-level scrollbar appears; sidebar scrolls internally as designed.
- Sidebar top items render without clipping.

---

### Prompt feedback

**What worked well:** You named the symptom precisely ("elements going outside of view", "bottom edges off screen") and pointed at both axes (padding + clipped panels). That made it a 2-file investigation instead of a hunt.

**How to sharpen next time:** Add the route or component name when you know it ("the website editor shell at `?tab=editor`") — it shaves a search step. Also: when you see clipping, mentioning the viewport size (you did, implicitly via the screenshot) and whether you can scroll inside vs. outside the panel helps disambiguate "the container is too tall" vs. "a child is overflowing." A one-liner like *"no scrollbar appears, content is just hidden under the chrome"* would have pinned the root cause (`min-h` overriding `h-full`) before I even opened the file.

### Enhancement suggestions

1. **Container query guard for the editor shell.** The shell currently assumes ≥1024px-ish. A `ResizeObserver`-driven minimum-size sentinel (per the Container-Aware Responsiveness canon) could surface a "Editor requires a wider window" stub instead of silently clipping on narrow tablets in landscape.
2. **Scroll-shadow affordance on the sidebar rail.** The clipped "Extensions Spotlight" header was a visibility-contract failure — users couldn't tell content was scrolled. A top/bottom fade-mask on the rail's scroll container would make overflow legible.
3. **Persist rail width.** The aside is fixed at `w-[340px]`. Wrapping sidebar + preview in the existing `ResizablePanelGroup` (already imported in this file but unused for this layout) would let operators widen the rail when editing long lists like Drink Menu items.
