

## Zura Website Editor — Luxury Glass Bento Infrastructure Redesign

### Assessment of Your Prompt

This is an exceptionally well-structured architectural brief. The positioning language ("operating surface, not a marketing builder"), the motion specification with specific timing ranges, and the strict three-panel constraint are exactly the kind of guardrails that prevent scope drift. Two areas for improvement: (1) The "Required Deliverables" section lists documents (component map, accessibility checklist, token compliance audit) that are better delivered as inline code comments and README sections than separate files -- calling that out explicitly avoids wasted effort. (2) The spec references "Layers" as a mode within the Structure panel, but the current architecture has no concept of visual layer inspection -- flagging Phase 2 items upfront prevents confusion about what ships now vs later.

---

### Current State

The Website Editor (`WebsiteSectionsHub.tsx`, 920 lines) uses a **two-panel** layout: a 300px sidebar (`WebsiteEditorSidebar.tsx`, 721 lines) on the left containing ALL navigation + content editing, and a resizable editor+preview split on the right. The sidebar is a monolithic scroll panel mixing page selection, site content navigation, homepage section ordering, and non-home page section management. Editor components (HeroEditor, NavigationManager, etc.) render inline in the center panel. There is no Inspector panel. The `EditorCard` component provides section-level containers but has no relationship to a contextual property inspector.

Key structural problems vs the spec:
- **No three-panel layout** -- editor content and inspector are merged
- **Sidebar is overloaded** -- structure, content data managers, page CRUD, and section ordering all coexist
- **No segmented control** (Pages / Layers / Navigation) in the structure panel
- **No contextual Inspector** -- properties are edited inline in editor components
- **Canvas is just an iframe** -- no insertion lines, no selection glow, no inline editing
- **Motion is default browser** -- no controlled transitions on panel/tab switches
- **No auto-save indicator** -- dirty state shows as amber dot, no "Saved" text fade

---

### Architecture Plan

This is a significant structural refactor. The plan is organized by panel, with shared infrastructure first.

#### Phase Boundary

**This plan covers the shell architecture only**: the three-panel layout, Structure panel with segmented tabs, Canvas header controls, Inspector panel with contextual empty/populated states, and motion system. It does NOT cover inline canvas editing (hover insertion lines, element selection glow, drag handles on canvas) -- that requires a fundamentally different rendering approach (canvas-aware component system) and is a separate Phase 2 effort.

---

### 1. Shared Infrastructure

**New file: `src/components/dashboard/website-editor/editor-tokens.ts`**

Editor-specific design tokens extending the platform token system. No new colors -- uses existing semantic tokens.

```text
editorPanel.structure  = 'w-[280px] bg-card/80 backdrop-blur-xl border-r border-border/40 shadow-sm'
editorPanel.canvas     = 'bg-card/60 backdrop-blur-2xl border-x border-border/30 shadow-inner'
editorPanel.inspector  = 'w-[320px] bg-card/80 backdrop-blur-xl border-l border-border/40 shadow-sm'
editorPanel.header     = 'h-12 px-4 border-b border-border/30 bg-card/90 backdrop-blur-md'
editorMotion.microMs   = 150    // micro interactions
editorMotion.panelMs   = 220    // panel transitions
editorMotion.modalMs   = 240    // modal transitions
editorMotion.easing    = [0.25, 0.1, 0.25, 1.0]  // cubic-bezier, no spring
```

**New file: `src/components/dashboard/website-editor/EditorMotion.tsx`**

Shared motion wrappers using `framer-motion` with the controlled timing spec:
- `<PanelSlideIn>` -- horizontal slide + opacity, 220ms, ease-in-out, 12px travel
- `<ContentFade>` -- opacity crossfade for tab content switches, 150ms
- `<ModalScaleIn>` -- scale 0.98→1.0 + opacity, 240ms

No spring physics. No overshoot. Controlled cubic-bezier only.

---

### 2. Structure Panel (Left, 280px Fixed)

**Replaces**: Current `WebsiteEditorSidebar.tsx` (721 lines)

**New file: `src/components/dashboard/website-editor/panels/StructurePanel.tsx`**

```text
┌──────────────────────────────┐
│ ┌──────────────────────────┐ │
│ │ Pages │ Layers │ Nav     │ │  ← Segmented glass control
│ └──────────────────────────┘ │
│                              │
│  [Content based on tab]      │
│                              │
└──────────────────────────────┘
```

**Segmented control**: A `SegmentedToggle` component using `bg-muted/60 rounded-lg p-1` with active segment `bg-background shadow-sm rounded-md`. Crossfade content on switch (no slide).

**Pages tab** (`panels/StructurePagesTab.tsx`):
- Clean list of pages from `useWebsitePages`
- Each row: page name, draft/published dot indicator, hover reveals "..." menu (Settings, Duplicate, Delete)
- Click selects page and updates canvas preview URL
- "Add Page" button at bottom
- No section listing here -- that moves to Layers

**Layers tab** (`panels/StructureLayersTab.tsx`):
- Only visible/populated when a page is selected
- Shows the section tree for the selected page (currently in `WebsiteEditorSidebar`)
- `SectionNavItem` components with drag-drop reorder
- Grouped by the existing `SECTION_GROUPS` logic
- Clicking a layer selects it in the Inspector
- Add Section button at bottom

**Navigation tab** (`panels/StructureNavTab.tsx`):
- Slim version of the current `NavigationManager` tree -- tree only, no inspector fields
- Menu selector dropdown (Primary / Footer)
- Menu items with drag reorder and nest (existing `MenuTreeEditor` + `MenuItemNode`)
- Clicking an item populates the Inspector with its properties
- Publish bar at bottom of this tab

**No settings controls in Structure panel.** Structure only.

---

### 3. Canvas Panel (Center, Flexible)

**Replaces**: Current `ResizablePanel` containing toolbar + editor content + `LivePreviewPanel`

**Modified file: `src/components/dashboard/website-editor/panels/CanvasPanel.tsx`**

The Canvas becomes a single unified surface. The current split between "editor content" and "live preview" is restructured:

```text
┌────────────────────────────────────────────────────┐
│ Site Name    Draft •    [Desktop│Tablet│Mobile]    │
│                         [Undo][Redo][Preview][Pub] │
├────────────────────────────────────────────────────┤
│                                                    │
│              Live Preview (iframe)                 │
│              Clean white canvas                    │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Top control strip** (`panels/CanvasHeader.tsx`):
- Left: Site name (from org), draft state indicator (amber dot + "Draft" / green dot + "Published")
- Center: Segmented responsive toggle -- Desktop / Tablet / Mobile (adds Tablet, currently only Desktop/Mobile). Uses same `SegmentedToggle` component. Tablet = 834px width.
- Right: Undo, Redo, Preview (opens new tab), Publish (primary accent button using `bg-primary text-primary-foreground`)
- Auto-save indicator: When save completes, show "Saved" text that fades in next to the draft indicator, fades out after 1.5s using `ContentFade`

**Canvas body**: The `LivePreviewPanel` iframe, full-bleed within the canvas panel. No editor forms here anymore -- all property editing moves to the Inspector.

**Key change**: Editor components (HeroEditor, BrandStatementEditor, etc.) no longer render in the center panel. They render in the Inspector panel instead, contextually based on what's selected in Structure > Layers.

---

### 4. Inspector Panel (Right, 320px Fixed)

**New file: `src/components/dashboard/website-editor/panels/InspectorPanel.tsx`**

**Default state** (nothing selected):
```text
┌──────────────────────────┐
│                          │
│     ◇                    │
│  Select an element       │
│  to edit                 │
│                          │
└──────────────────────────┘
```
Uses `tokens.empty.*` styling. Calm, minimal.

**Populated state** (element selected from Structure):

The Inspector renders the appropriate editor component based on what's selected:

- **Section selected in Layers** → Renders the corresponding editor (HeroEditor, TestimonialsEditor, etc.) + `SectionStyleEditor`
- **Navigation item selected in Nav tab** → Renders `MenuItemInspector`
- **Page selected in Pages tab** → Renders `PageSettingsEditor` (SEO, slug, status, SERP preview)

All editor components render inside the Inspector's `ScrollArea` with `PanelSlideIn` animation on context change.

**Collapsible groups**: Editor components that currently use `EditorCard` sections will be refactored to use `Collapsible` groups within the Inspector. Only one group expanded by default. Groups:
- For sections: Layout, Content, Background, Spacing, Advanced
- For nav items: Label, Link, Visibility, Tracking (Advanced)
- For pages: General, SEO, Status, Advanced

**New file: `src/components/dashboard/website-editor/panels/InspectorGroup.tsx`**
A collapsible section component:
- `Collapsible` from Radix with chevron rotation
- Group title uses `tokens.heading.subsection`
- Subtle bottom border between groups
- Only first group auto-expanded

---

### 5. Hub Restructure

**Modified file: `src/pages/dashboard/admin/WebsiteSectionsHub.tsx`**

The 920-line hub gets significantly simplified. The new layout:

```text
┌────────────────────────────────────────────────────────────────┐
│ [Structure 280px] │ [Canvas flex-1]         │ [Inspector 320px]│
│                   │                         │                  │
│ Pages|Layers|Nav  │ Header + iframe         │ Contextual props │
│                   │                         │                  │
└────────────────────────────────────────────────────────────────┘
```

- No `ResizablePanelGroup` -- panels are fixed-width, not resizable (per spec: "No deviation from this layout")
- Structure and Inspector are `flex-shrink-0` with fixed widths
- Canvas is `flex-1`
- Mobile: Structure slides in as drawer from left, Inspector slides in from right. Canvas is full-width. Bottom toolbar for triggering panels.

**State management changes**:
- `activeTab` is replaced by a more semantic selection model:
  - `structureMode: 'pages' | 'layers' | 'navigation'`
  - `selectedPageId: string`
  - `selectedSectionId: string | null` (for Layers)
  - `selectedNavItemId: string | null` (for Navigation)
- The Inspector reads from these to determine what to render
- No more `EDITOR_COMPONENTS` map -- replaced by a `getInspectorContent(selection)` function

---

### 6. Motion Behavior Specification

| Interaction | Duration | Easing | Effect |
|---|---|---|---|
| Segmented tab switch | 150ms | ease-in-out | Opacity crossfade, no slide |
| Inspector context change | 220ms | ease-in-out | Slide-in from right 12px + fade |
| Structure panel items | 120ms | ease-out | Opacity + shadow on hover only |
| Modal open | 240ms | ease-in-out | Scale 0.98→1.0 + fade + backdrop blur increase |
| Modal close | 180ms | ease-in | Scale 1.0→0.98 + fade out |
| Drag reorder | Smooth | Linear interp | Positional, no snap jitter |
| Auto-save "Saved" text | 300ms in, 300ms out | ease-in-out | Opacity fade, 1.5s hold |
| Publish button | 150ms | ease-out | Subtle scale 1.0→0.97→1.0 on click |
| Hover states | 120ms | ease-out | Opacity and shadow only, no movement |

No `spring` animations anywhere. All `framer-motion` variants use `transition: { duration, ease }`.

---

### 7. Files Summary

**New files (10)**:
- `src/components/dashboard/website-editor/editor-tokens.ts`
- `src/components/dashboard/website-editor/EditorMotion.tsx`
- `src/components/dashboard/website-editor/panels/StructurePanel.tsx`
- `src/components/dashboard/website-editor/panels/StructurePagesTab.tsx`
- `src/components/dashboard/website-editor/panels/StructureLayersTab.tsx`
- `src/components/dashboard/website-editor/panels/StructureNavTab.tsx`
- `src/components/dashboard/website-editor/panels/CanvasPanel.tsx`
- `src/components/dashboard/website-editor/panels/CanvasHeader.tsx`
- `src/components/dashboard/website-editor/panels/InspectorPanel.tsx`
- `src/components/dashboard/website-editor/panels/InspectorGroup.tsx`

**Major modifications (2)**:
- `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` -- complete restructure from 2-panel to 3-panel
- `src/components/dashboard/website-editor/LivePreviewPanel.tsx` -- simplified, header controls extracted to CanvasHeader

**Preserved files (no changes)**:
- All editor components (HeroEditor, BrandStatementEditor, etc.) -- they render inside InspectorPanel instead of the center panel, but their internal logic is unchanged
- `EditorCard.tsx` -- still used within Inspector for grouped sections
- `NavigationManager.tsx` subcomponents -- `MenuTreeEditor`, `MenuItemNode`, `MenuItemInspector`, etc.

**Deprecated files (to be removed after migration)**:
- `WebsiteEditorSidebar.tsx` -- replaced by `StructurePanel`
- `ContentNavItem.tsx` -- functionality absorbed into `StructurePagesTab` / `StructureLayersTab`
- `SectionNavItem.tsx` -- rebuilt within `StructureLayersTab` with simplified styling
- `SectionGroupHeader.tsx` -- replaced by `InspectorGroup` headers

---

### 8. What This Does NOT Include (Future Phases)

- **Canvas interactivity** (hover insertion lines, element selection glow, inline text editing, drag handles on canvas) -- requires a component-aware rendering layer, not just an iframe
- **Media modal** -- needs asset management system
- **Mega menu editor** -- behind feature flag
- **Version history / rollback UI** -- exists in hooks, needs Inspector tab
- **Accessibility audit checklist** -- delivered as code comments and ARIA attributes within components
- **Token compliance audit** -- enforced through the `editor-tokens.ts` system; no separate document

---

### Enhancement Suggestions

- After implementing the three-panel shell, test the full flow: select a page in Structure, verify Inspector populates, switch to Layers, click a section, confirm Inspector updates contextually
- Add keyboard navigation between panels (Tab/Shift+Tab to cycle Structure → Canvas → Inspector) for accessibility
- Build the Canvas interactivity layer (hover insertion lines, selection glow) as a separate Phase 2 deliverable once the shell is stable
- Add a "Quick Actions" command palette (Cmd+K) that searches across pages, sections, and navigation items for power-user efficiency

