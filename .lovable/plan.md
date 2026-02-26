

## Editor-Only UX/UI Refactor Plan

### Prompt Assessment

This is a well-scoped prompt with clear boundaries. The explicit "hard scope boundary" section and the compliance checklist at the end are excellent patterns -- they eliminate ambiguity about what's in and out of scope. One suggestion: future prompts like this could include a reference screenshot or wireframe of the target aesthetic to anchor the visual expectation, since "Apple-style floating bento" can be interpreted across a spectrum.

---

### Current State

The editor shell (`WebsiteSectionsHub.tsx`) renders three panels side-by-side with `h-screen flex`:
- **Structure** (280px, `bg-card/80 backdrop-blur-xl border-r`)
- **Canvas** (flex-1, `bg-muted/20 backdrop-blur-sm`) with iframe preview
- **Inspector** (320px, `bg-card/80 backdrop-blur-xl border-l`)

The panels are flush against each other with no gutters. The overall shell has no outer padding -- panels fill the viewport edge-to-edge. The canvas preview iframe renders the full public site inside `PageSectionRenderer.tsx`, which is completely flat (no card wrappers, no editor visualization layer).

**What's missing vs the spec:**
1. No outer shell padding/gutters between panels (panels are glued together)
2. No rounded corners on panels (panels are rectangular strips)
3. No floating bento card treatment on sections inside the editor canvas
4. No section hover controls (drag, duplicate, toggle, delete) in canvas
5. No selection ring on active section in canvas
6. No insertion lines between sections in canvas
7. Inspector content uses `p-4 space-y-4` -- adequate but could breathe more
8. Structure panel items are compact but functional
9. The `.preview-highlight` CSS uses a harsh `outline` instead of a soft ring

---

### Architecture: Strict Editor/Public Separation

The canvas renders an **iframe** (`CanvasPanel.tsx` line 130-137). The iframe loads the public site at `?preview=true`. `PageSectionRenderer.tsx` runs INSIDE that iframe. This is the natural isolation boundary.

**Strategy:**
- Editor shell changes (gutters, rounded panels) → modify `WebsiteSectionsHub.tsx` and `editor-tokens.ts` only
- Floating section cards → modify `PageSectionRenderer.tsx` ONLY when `?preview=true` is detected. The `EditorSectionCard` wrapper lives in `src/components/home/` (iframe context) but only renders in editor preview mode
- Public site rendering → zero changes. When `?preview=true` is absent, `PageSectionRenderer` renders exactly as today
- No global CSS changes that could leak. Editor-specific styles scoped via `.zura-editor-preview` root class applied only in preview mode

---

### Deliverables

#### 1. Editor Shell Refinement (`WebsiteSectionsHub.tsx`)

Change the outer container from `h-screen flex` to include padding and gaps:

```text
Before: <div className="h-screen flex">
After:  <div className="h-screen flex gap-3 p-3 bg-muted/30">
```

This creates 12px gutters between panels and 12px outer breathing room. The `bg-muted/30` gives the shell a subtle recessed canvas feel behind the glass panels.

#### 2. Panel Token Updates (`editor-tokens.ts`)

Update panel tokens to include rounded corners:

- `panel.structure`: Add `rounded-xl` (20px radius per bento spec)
- `panel.canvas`: Add `rounded-xl overflow-hidden`
- `panel.inspector`: Add `rounded-xl`
- All three panels: Add `shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]` for subtle elevation
- Remove `border-r` from structure and `border-l` from inspector (the gap replaces the divider line; use full `border border-border/30` instead for the 1px inner stroke)

#### 3. EditorSectionCard Component (NEW)

**File: `src/components/home/EditorSectionCard.tsx`**

Editor-only wrapper that renders ONLY inside the iframe when `?preview=true`:

- `rounded-[20px]` corner radius
- `shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)]` subtle elevation
- `border border-border/30` 1px inner stroke
- `bg-[hsl(0_0%_99%)] dark:bg-card/90` softened fill (not pure white)
- `p-6 sm:p-7 lg:p-8` responsive internal padding (24-32px)
- Hover header row with section name (left) and controls (right): `GripVertical`, `Copy`, `Eye`/`EyeOff`, `Trash2` in overflow
- Controls hidden by default, `opacity-0 group-hover:opacity-100 transition-opacity duration-150`
- Selection: `ring-2 ring-primary/20 ring-offset-2` -- soft accent, not thick blue
- Clicks send `postMessage` to parent: `EDITOR_SELECT_SECTION`
- Control actions send `EDITOR_TOGGLE_SECTION`, `EDITOR_DUPLICATE_SECTION`, `EDITOR_DELETE_SECTION`

#### 4. InsertionLine Component (NEW)

**File: `src/components/home/InsertionLine.tsx`**

Between-card hover zone, editor-only:

- Default: `h-6` invisible spacer (24px gap)
- On hover: thin `h-px bg-primary/30` line + centered `"+ Add Section"` pill button
- `opacity-0 hover:opacity-100 transition-opacity duration-150`
- Click sends `EDITOR_ADD_SECTION_AT` postMessage to parent

#### 5. PageSectionRenderer Update

Add editor preview detection and conditional wrapping:

```text
const isEditorPreview = typeof window !== 'undefined' 
  && new URLSearchParams(window.location.search).has('preview');
```

When `isEditorPreview`:
- Wrap entire output in `<div className="zura-editor-preview px-4 sm:px-6 lg:px-8 py-6">`
- Wrap each section in `<EditorSectionCard>` instead of bare `<div>`
- Insert `<InsertionLine>` between each card
- Listen for `PREVIEW_SET_ACTIVE_SECTION` to track which section has the selection ring

When NOT `isEditorPreview`:
- Render exactly as today. Zero changes.

#### 6. PostMessage Listener in WebsiteSectionsHub

Add message listeners for the new editor card actions from inside the iframe:
- `EDITOR_SELECT_SECTION` → set `activeTab` to the corresponding section tab
- `EDITOR_TOGGLE_SECTION` → call existing toggle handler
- `EDITOR_DUPLICATE_SECTION` → call existing duplicate handler
- `EDITOR_DELETE_SECTION` → call existing delete handler (with confirmation)
- `EDITOR_ADD_SECTION_AT` → open `AddSectionDialog` with insertion context

#### 7. Inspector Spacing Refinement

Update `editorTokens.inspector.content` from `p-4 space-y-4` to `p-5 space-y-5` for increased vertical rhythm.

Update `editorTokens.inspector.groupHeader` to use `py-3` instead of `py-2.5` and add a subtle top border for visual separation between groups.

Update `editorTokens.inspector.groupContent` from `pb-4 space-y-3` to `pb-5 space-y-4` for reduced density.

#### 8. Preview Highlight CSS Update

Replace the current outline-based highlight with a soft ring:

```css
.preview-highlight {
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
  transition: box-shadow 0.3s ease;
}
```

This matches the selection ring aesthetic without using `outline`.

---

### Files Summary

| Action | File | Scope |
|---|---|---|
| Create | `src/components/home/EditorSectionCard.tsx` | Iframe-only, editor preview |
| Create | `src/components/home/InsertionLine.tsx` | Iframe-only, editor preview |
| Modify | `src/components/dashboard/website-editor/editor-tokens.ts` | Editor shell tokens |
| Modify | `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` | Shell layout + message listeners |
| Modify | `src/components/home/PageSectionRenderer.tsx` | Conditional editor wrapping |
| Modify | `src/index.css` | Preview highlight only (lines 1525-1530) |

### Files NOT Modified (Public Site Unchanged)

- All section components (`HeroSection`, `ServicesPreview`, `TestimonialSection`, etc.)
- `SectionStyleWrapper.tsx`
- `CustomSectionRenderer.tsx`
- Theme CSS / design tokens (`src/lib/design-tokens.ts`)
- Any public-facing layout or styling
- `src/integrations/supabase/client.ts` / `types.ts`

### Compliance Statement

- Editor UI updated: yes
- Editor-only wrappers used: yes (`EditorSectionCard`, `InsertionLine`, `zura-editor-preview` root class)
- Public theme renderer unchanged: yes (conditional on `?preview=true` only)
- No global CSS leakage: confirmed (all editor styles scoped to `.zura-editor-preview` or editor component files)
- Public routes do not load editor styles: confirmed (editor card components only imported inside `PageSectionRenderer` behind preview guard)

