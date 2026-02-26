

## Editor Shell Responsiveness Plan

### Prompt Assessment

Excellent specification with clear breakpoint definitions and priority ordering for panel collapse. The "collapse inspector first, then structure" hierarchy is the right call. One refinement for future prompts: the "desktop preview must be true 16:10 ratio" requirement conflicts with how iframe previews work -- the iframe already renders a real website at whatever dimensions are available. Constraining it to a fixed aspect ratio would add letterboxing that makes the preview less useful, not more. The better approach is a max-width constraint with natural height fill, which is what pro tools (Webflow, Framer) actually do. The plan below implements the spirit of the request (constrained, centered, breathing room) without the letterboxing downside.

---

### Current State

The editor shell at line 647 of `WebsiteSectionsHub.tsx`:
```
<div className="h-screen flex gap-3 p-3 bg-muted/30">
```

- **Structure panel**: Fixed `w-[280px]` via `editorTokens.panel.structure` -- no min/max, no collapse
- **Inspector panel**: Fixed `w-[320px]` via `editorTokens.panel.inspector` -- no min/max, no collapse
- **Canvas panel**: `flex-1 min-w-0` -- takes whatever's left
- **Mobile handling**: `useIsMobile()` at 768px -- binary switch to drawer/FAB, no intermediate breakpoints
- **No resize handles**, no collapse buttons, no width persistence, no viewport frame for desktop preview

At 1024px viewport: 280 + 320 + 24 (gaps+padding) = 624px consumed by panels → canvas gets ~400px. That's below any usable editing threshold.

---

### Architecture

#### New hook: `src/hooks/useEditorLayout.ts`

A single responsive layout manager that:
- Reads `window.innerWidth` via `ResizeObserver` on the shell container
- Computes panel visibility states deterministically from width
- Persists user-chosen panel widths to `localStorage`
- Exposes collapse/expand toggle functions
- Returns computed CSS values for each panel

```text
Breakpoint map:
  ≥1440px  (wide):     structure=280-320, inspector=340-380, both visible
  1200-1439 (standard): structure=260-280, inspector=320-340, both visible
  1024-1199 (compact):  structure=260, inspector=collapsed (icon tab), canvas priority
  768-1023  (tablet):   structure=collapsed (overlay), inspector=collapsed (overlay)
  <768      (mobile):   existing drawer/FAB behavior (unchanged)
```

Panel collapse priority: inspector first, then structure.

#### Modified tokens: `editor-tokens.ts`

Remove fixed `w-[280px]` and `w-[320px]` from panel tokens. Panels get their width from the layout manager via inline styles. Tokens retain glass/blur/radius/shadow only.

#### Modified shell: `WebsiteSectionsHub.tsx`

- Use `useEditorLayout` to get panel states and widths
- Render collapse toggle buttons on each panel header
- When inspector is collapsed: render a thin glass icon rail (40px wide, rounded-xl) with a button to expand
- When structure is collapsed: render a thin glass icon rail (40px wide) with Pages/Layers/Nav icons
- Canvas gets `minWidth: 0` with flexbox doing the work -- the layout manager prevents panels from stealing too much space by collapsing them first

#### Modified: `CanvasPanel.tsx`

- Desktop viewport mode: constrain iframe to `max-w-[1280px]` centered with `mx-auto` and subtle padding (`px-6 py-4`), so the preview floats within the canvas rather than stretching edge-to-edge
- Add "Fit" zoom controls to `CanvasHeader`: Fit / 100% / 75% -- these apply CSS `transform: scale()` to the iframe container only

#### Modified: Panel components

- `StructurePanel.tsx`: Accept `isCollapsed` prop → render icon rail when collapsed
- `InspectorPanel.tsx`: Accept `isCollapsed` prop → render icon rail when collapsed
- Both: Add collapse/expand button in their headers

---

### Deliverables

#### 1. `src/hooks/useEditorLayout.ts` (NEW)

State machine for editor panel layout:

- `containerRef` → attach to shell div, uses `ResizeObserver`
- Computed state: `{ structureWidth, inspectorWidth, structureVisible, inspectorVisible, isCompact, isTablet, isMobile }`
- `toggleStructure()`, `toggleInspector()` -- manual collapse/expand
- Auto-collapse logic: if available canvas width < 820px after both panels, collapse inspector. If still < 820px, collapse structure.
- Persists widths to `localStorage('editor-panel-widths')`
- Returns `structureWidth` clamped to [260, 320], `inspectorWidth` clamped to [320, 380]

#### 2. `editor-tokens.ts` updates

- Remove `w-[280px]` from `panel.structure` → becomes `flex-shrink-0 bg-card/80 backdrop-blur-xl border border-border/30 rounded-xl shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]`
- Remove `w-[320px]` from `panel.inspector` → same treatment
- Add new token `panel.collapsedRail`: `w-10 flex-shrink-0 bg-card/80 backdrop-blur-xl border border-border/30 rounded-xl shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] flex flex-col items-center py-3 gap-2`

#### 3. `StructurePanel.tsx` updates

- Accept `isCollapsed: boolean` and `onToggleCollapse: () => void` props
- When collapsed: render icon rail with three icon buttons (FileText, Layers, Navigation) stacked vertically, plus an expand chevron at top
- When expanded: render as today, plus a collapse button (ChevronLeft icon) in the header area

#### 4. `InspectorPanel.tsx` updates

- Accept `isCollapsed: boolean` and `onToggleCollapse: () => void` props
- When collapsed: render icon rail with a single expand button (ChevronLeft mirrored)
- When expanded: render as today, plus a collapse button (ChevronRight icon) in the header

#### 5. `CanvasPanel.tsx` updates

- Desktop viewport: wrap iframe in `max-w-[1280px] mx-auto` container with `px-6 py-4` padding so the preview floats
- Add zoom state: `'fit' | '100' | '75'` with `transform: scale()` on the iframe wrapper
- Add zoom controls to `CanvasHeader` (three small buttons in the center area, after viewport toggle)

#### 6. `CanvasHeader.tsx` updates

- Add zoom level controls: Fit / 100% / 75% as a segmented control after the viewport toggle
- Accept `zoomLevel` and `onZoomChange` props

#### 7. `WebsiteSectionsHub.tsx` updates

- Import and use `useEditorLayout`
- Pass `ref` to shell container
- Conditionally render structure/inspector based on layout state
- Pass `isCollapsed` + `onToggleCollapse` to panel components
- Apply computed widths via `style={{ width: structureWidth }}` instead of token classes
- Keep existing mobile drawer/FAB logic for <768px (unchanged)

---

### Files Summary

| Action | File |
|---|---|
| Create | `src/hooks/useEditorLayout.ts` |
| Modify | `src/components/dashboard/website-editor/editor-tokens.ts` |
| Modify | `src/components/dashboard/website-editor/panels/StructurePanel.tsx` |
| Modify | `src/components/dashboard/website-editor/panels/InspectorPanel.tsx` |
| Modify | `src/components/dashboard/website-editor/panels/CanvasPanel.tsx` |
| Modify | `src/components/dashboard/website-editor/panels/CanvasHeader.tsx` |
| Modify | `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` |

No public site files modified. No database changes.

