

## Floating Bento Card Section Rendering

### Prompt Assessment
Strong visual spec with clear deliverables. One important architectural distinction to call out: the Canvas panel renders an **iframe** pointing at `/?preview=true`. The section components (`HeroSection`, `ServicesPreview`, etc.) render INSIDE that iframe context. So the bento card treatment must be applied at the `PageSectionRenderer` level (inside the iframe), NOT at the `CanvasPanel` level (outside). The `?preview=true` query param is already in the URL but isn't consumed anywhere yet -- this becomes the toggle for editor-mode rendering vs public-site rendering.

For future prompts: specifying whether the floating card treatment applies to the **public-facing site** or **only within the editor canvas preview** up front would prevent ambiguity. Based on context, this is editor-only.

---

### Architecture

The rendering happens in two contexts:
1. **Public site** (`/org/{slug}`) -- sections render as continuous page (unchanged)
2. **Editor preview** (`/org/{slug}?preview=true`) -- sections render as floating bento cards

The switch is detected via `?preview=true` URL param, already present in the iframe src.

```text
┌─ CanvasPanel (iframe src=?preview=true) ──────────┐
│                                                     │
│  ┌─ PageSectionRenderer ─────────────────────────┐  │
│  │                                                │  │
│  │  ┌─ EditorSectionCard (NEW) ────────────────┐  │  │
│  │  │  hover header: name + controls           │  │  │
│  │  │  ┌─ SectionStyleWrapper ───────────────┐ │  │  │
│  │  │  │  <HeroSection />                    │ │  │  │
│  │  │  └─────────────────────────────────────┘ │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  │                                                │  │
│  │  ┌─ InsertionLine (NEW, between cards) ─────┐  │  │
│  │  │  "+ Add Section" on hover                │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  │                                                │  │
│  │  ┌─ EditorSectionCard ─────────────────────┐  │  │
│  │  │  <ServicesPreview />                     │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  │                                                │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

### Deliverables

#### 1. New component: `src/components/home/EditorSectionCard.tsx`

The floating bento card wrapper. Only renders in editor preview mode.

**Card styling:**
- `rounded-[20px]` corner radius
- `shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)]` -- subtle elevation, not heavy
- `border border-border/30` -- 1px inner stroke at low opacity
- `bg-[hsl(0_0%_98%)]` in light mode / `bg-card/90` in dark -- slightly softened, not pure white
- `p-6 sm:p-7 lg:p-8` -- 24-32px internal padding, responsive

**Hover header row:**
- `opacity-0 group-hover:opacity-100 transition-opacity duration-150`
- Left: section label (`font-sans text-xs text-muted-foreground`)
- Right: icon buttons -- drag handle (`GripVertical`), duplicate (`Copy`), visibility toggle (`Eye`/`EyeOff`), overflow menu with delete
- All buttons `h-6 w-6` ghost variant, `text-muted-foreground/60`
- Header positioned inside the card, above the content, with `pb-2` spacing

**Selection state:**
- `ring-2 ring-primary/20 ring-offset-2 ring-offset-background` -- soft accent glow
- NOT a thick blue border

**PostMessage integration:**
- On click, sends `EDITOR_SELECT_SECTION` message to parent (the editor hub)
- Listens for `PREVIEW_HIGHLIGHT_SECTION` to apply selection ring
- Listens for `PREVIEW_SCROLL_TO_SECTION` (already exists)

**Controls send postMessage to parent:**
- Toggle: `{ type: 'EDITOR_TOGGLE_SECTION', sectionId, enabled }`
- Duplicate: `{ type: 'EDITOR_DUPLICATE_SECTION', sectionId }`
- Delete: `{ type: 'EDITOR_DELETE_SECTION', sectionId }`
- Parent (`WebsiteSectionsHub`) listens and executes mutations

#### 2. New component: `src/components/home/InsertionLine.tsx`

Between-card insertion zone.

- Default: invisible (`h-6` spacer between cards, 24px gap)
- On hover: shows a thin `h-px bg-primary/30` line with a centered pill button `"+ Add Section"` (`text-[11px] font-sans px-3 py-1 rounded-full bg-primary/10 text-primary`)
- `opacity-0 hover:opacity-100 transition-opacity duration-150`
- On click: sends `{ type: 'EDITOR_ADD_SECTION_AT', afterSectionId }` to parent
- Parent opens the existing `AddSectionDialog` with insertion index context

#### 3. Modified: `src/components/home/PageSectionRenderer.tsx`

- Detect editor mode: `const isEditorPreview = new URLSearchParams(window.location.search).has('preview')`
- When `isEditorPreview`:
  - Wrap the canvas in `px-4 sm:px-6 lg:px-8 py-6` outer padding (gutter from canvas edges)
  - Wrap each section in `<EditorSectionCard>` instead of bare `<div>`
  - Insert `<InsertionLine>` between each card
  - Apply `space-y-0` (gap managed by InsertionLine's height)
- When NOT `isEditorPreview`:
  - Render exactly as today (no card wrapper, no insertion lines)
  - Zero visual change to the public site

#### 4. Modified: `src/index.css`

- Update `.preview-highlight` to use `ring` instead of `outline` to match selection state
- Add `.editor-section-card` utility class for the card base styles

#### 5. Modified: `src/pages/dashboard/admin/WebsiteSectionsHub.tsx`

- Add `message` event listener for new editor card actions (`EDITOR_SELECT_SECTION`, `EDITOR_TOGGLE_SECTION`, `EDITOR_DUPLICATE_SECTION`, `EDITOR_DELETE_SECTION`, `EDITOR_ADD_SECTION_AT`)
- Route each to existing mutation handlers

---

### Spacing Spec

| Element | Desktop | Tablet | Mobile |
|---|---|---|---|
| Canvas outer gutter | 32px (`px-8`) | 24px (`px-6`) | 16px (`px-4`) |
| Card internal padding | 32px (`p-8`) | 28px (`p-7`) | 24px (`p-6`) |
| Card corner radius | 20px | 20px | 20px |
| Card separation (InsertionLine height) | 24px | 24px | 20px |
| Card shadow | `0 2px 12px -4px rgba(0,0,0,0.08)` | same | same |
| Card border | `1px border-border/30` | same | same |

Cards never touch canvas edges on any breakpoint (minimum 16px gutter on mobile).

---

### Files

| Action | File |
|---|---|
| Create | `src/components/home/EditorSectionCard.tsx` |
| Create | `src/components/home/InsertionLine.tsx` |
| Modify | `src/components/home/PageSectionRenderer.tsx` |
| Modify | `src/index.css` (preview-highlight update) |
| Modify | `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` (message listeners) |

**Preserved (no changes):**
- All individual section components (HeroSection, ServicesPreview, etc.)
- SectionStyleWrapper (still applies inside the card)
- CanvasPanel (still renders the iframe as-is)
- Public-facing site rendering (zero visual change)

