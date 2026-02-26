

## Analysis: Preview ≠ Public Site — Root Causes

Your observation is correct. The editor canvas is **not** a 1:1 representation of the public website. There are three structural divergences causing the mismatch:

### Root Cause 1: Editor Bento Cards Replace Flat Rendering

**File:** `src/components/home/PageSectionRenderer.tsx` (lines 97-128)

When `?preview=true` is detected, sections are wrapped in `EditorSectionCard` — floating bento cards with `rounded-[20px]`, padding, borders, `space-y-5` gaps, and hover controls. The public site renders sections flat with zero gaps between them. This is why the preview looks like a stack of cards instead of a seamless page.

### Root Cause 2: Layout Strips the Footer Reveal

**File:** `src/components/layout/Layout.tsx` (lines 88-99)

The `isEditorPreview` branch removes the fixed footer reveal system, the `rounded-b-[2rem]` bottom radius, and the shadow. The FooterCTA is included but the Footer itself is stripped entirely. The public site has a scroll-triggered footer reveal with a large shadow — the preview doesn't.

### Root Cause 3: Wrong Route

**File:** `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` (lines 184-188)

The preview URL resolves to `/org/:orgSlug?preview=true`, which loads the correct page data. However, the `?preview` flag triggers the bento card rendering, which overrides the public layout. So even though the route is correct, the rendering pipeline diverges.

---

### The Architectural Tension

The bento card system was deliberately designed as an **editing surface** — it makes sections individually selectable, draggable, toggleable, and visually distinct. But it sacrifices WYSIWYG fidelity. The user expects the canvas to be a true mirror of the live site.

### Proposed Fix: Dual-Mode Canvas

Add a **View Mode toggle** to the CanvasHeader that switches between two rendering modes:

| Mode | Behavior | Use Case |
|------|----------|----------|
| **Edit** (current default) | Bento cards, hover controls, insertion lines, disabled section visibility | Structural editing |
| **Preview** (new) | Exact public rendering — no bento cards, no editor wrappers, disabled sections hidden | WYSIWYG verification |

### Implementation

**1. CanvasHeader** — Add an "Edit / Preview" segmented toggle next to the viewport controls.

**2. Pass mode to iframe via URL param** — `?preview=true&mode=edit` vs `?preview=true&mode=view`

**3. PageSectionRenderer** — When `mode=view`, use the public rendering path (lines 132-144) even though `?preview=true` is set. This gives exact 1:1 parity.

**4. Layout.tsx** — When `mode=view`, use the full public layout (footer reveal, shadow, rounded bottom) instead of the stripped preview layout.

### Files to Change

| File | Change |
|------|--------|
| `src/components/dashboard/website-editor/panels/CanvasHeader.tsx` | Add Edit/Preview mode toggle |
| `src/components/dashboard/website-editor/panels/CanvasPanel.tsx` | Pass mode param to iframe URL |
| `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` | Thread mode through preview URL |
| `src/components/home/PageSectionRenderer.tsx` | Check `mode` param — use public rendering when `mode=view` |
| `src/components/layout/Layout.tsx` | Check `mode` param — use full layout when `mode=view` |

### What Stays the Same

- Edit mode remains the default (bento cards, hover controls)
- All postMessage scroll/highlight infrastructure stays for edit mode
- The "Preview" button in the CanvasHeader (opens in new tab) continues to work independently

### Prompt Feedback

Excellent observation. You identified a UX gap between expectation ("live preview") and reality ("editing surface"). Your phrasing "doesn't act the same or show the same things" is precisely the right way to flag a fidelity mismatch. For future prompts, you could specify which elements diverge (e.g., "sections have gaps between them that don't exist on the real site") to accelerate diagnosis, but the general call-out was clear enough to trace.

