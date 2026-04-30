# Wire draft preview to be clickable, editable, and rail-synced

## Positive feedback on your prompt

Strong product framing — you described the user-visible outcome ("elements are clickable and editable") AND the system behavior ("update the left rail in real time"), with a screenshot for context. That tells me both *what* and *why*, not just *how*.

**Even better next time:** name the granularity. "Clickable and editable" can mean three different things:
1. Click any **section** → rail jumps to its editor (section-level select)
2. Click any **text** → edit it in place, persists on blur (inline text edit)
3. Click any **image/CTA** → opens a property panel (rich element editing)

I'm scoping all three below because they share infrastructure, but if you only meant #1 or only #2, the answer compresses by half. Telling me upfront ("just text edits for now" or "section selection only") avoids over-engineering.

## What's already built (and why nothing happens today)

The codebase already has a remarkably complete editor↔canvas bridge:

```text
CANVAS (iframe)                      SHELL (parent)
─────────────────                    ───────────────
EditorSectionCard                    WebsiteEditorShell
 ├─ click → EDITOR_SELECT_SECTION ──→ resolves tab → opens in rail ✓
 ├─ toggle → EDITOR_TOGGLE_SECTION ─→ handlePageSectionToggle      ✓
 ├─ chips → EDITOR_APPLY_STYLE_PRESET → updatePages.mutate         ✓
 └─ menu → EDITOR_OPEN_STYLE ───────→ opens style panel             ✓

InlineEditableText
 └─ blur → INLINE_EDIT_COMMIT ──────→ InlineEditCommitHandler
                                       ├─ allowlist check          ✓
                                       ├─ update mutation          ✓
                                       └─ undo/redo entry          ✓
```

13 section types already have inline-editable text fields wired (Hero, Brand Statement, Testimonials, FAQ, Footer CTA, New Client, Extensions, Gallery, Locations, Stylists, Drink Menu, Brands, Extension Reviews).

**The single line that breaks all of it:** `WebsiteEditorShell.tsx:316`

```ts
const livePreviewUrl = publicPageUrl(selectedPage?.slug, {
  preview: true,
  mode: 'view',          // ← this kills both flows
});
```

`mode=view` does two things in the iframe:
- `PageSectionRenderer` skips the `EditorSectionCard` wrapper and renders the raw public layout → no click target, no select chrome (line 181: `if (!isEditorPreview || isViewMode)`)
- `InlineEditableText` renders inert plain text instead of a contentEditable surface (line 52: `if (params.get('mode') === 'view') return false`)

So the current Draft Preview is a **read-only** rendering of the published layout. None of the existing edit infrastructure activates.

## Plan

### 1. Switch the live preview from `view` to `edit` mode

Change the URL builder to `mode: 'edit'` (or drop `mode` entirely so `preview=true` alone activates editor chrome).

`src/components/dashboard/website-editor/WebsiteEditorShell.tsx:316`:
```ts
const livePreviewUrl = publicPageUrl(selectedPage?.slug, {
  preview: true,
  mode: 'edit',
});
```

This single change:
- Activates `EditorSectionCard` wrapping → click any section → rail jumps to its editor (already wired via `EDITOR_SELECT_SECTION`).
- Activates `InlineEditableText` → all 13 section types' text fields become click-to-edit, persisting via the existing commit handler.
- Activates style chips, toggle, duplicate, delete buttons on each section card.
- Hover/focus rings appear on every editable text node.

### 2. Add a Preview/Edit mode toggle in the LivePreviewPanel toolbar

`mode=view` is genuinely useful — it shows the operator what visitors see without edit chrome. We should keep it accessible, just not as the default.

`src/components/dashboard/website-editor/LivePreviewPanel.tsx`:
- Add a two-state segmented control next to the device picker: **"Edit"** (default, current `mode=edit`) | **"Preview"** (clean `mode=view`).
- Persist choice in `localStorage` under `website-editor:canvas-mode`.
- Lift state up via a callback prop OR (simpler) read it inside the panel and append `&mode=…` to the iframe `src`. The shell just provides the base URL without `mode`; the panel decides which mode to load.

This keeps the operator in control: click into Edit when they want to change something, switch to Preview to see the visitor view.

### 3. Confirm rail-side selection state reflects the canvas click

When the iframe posts `EDITOR_SELECT_SECTION`, the shell already calls `requestTabChange(tab)` which updates `editorTab`. The sidebar passes `activeTab` to each `SectionNavItem` and highlights the active row. That loop is closed — verify in the browser after enabling edit mode.

We've also already wired the **reverse** direction this morning: clicking a rail item sets `activePreviewSectionId`, which the panel posts as `PREVIEW_SCROLL_TO_SECTION` and `PREVIEW_HIGHLIGHT_SECTION`. So both directions sync.

### 4. Two small UX hardenings

**a. Scroll-into-view when canvas selection comes from a click.**
Today, clicking a section in the canvas opens its editor in the rail but doesn't scroll the rail. If the operator clicked a section that's below the fold of the rail's section list, they won't see the highlight. Add a `scrollIntoView({ block: 'nearest' })` call inside `SectionNavItem` when `isActive` flips on.

**b. Suppress the section-card chrome on focused inline edits.**
When the operator is mid-typing in an `InlineEditableText`, the surrounding `EditorSectionCard` chrome (chips, toggle) should fade so it doesn't compete visually. Add a `:focus-within` rule to `EditorSectionCard` that drops the chrome's opacity to ~0.3.

## Verification (browser, after change)

1. Open Website Editor → preview iframe loads with `mode=edit`.
2. Hover any text in the canvas → faint primary-tinted ring appears. Click → contentEditable; type a new headline; Tab/Enter → text persists, "Saved" pulse fires, rail's section highlights.
3. Click a section's blank area → rail jumps to that section's editor tab. The section that was clicked highlights in the rail with the active state.
4. Click the section's eyeball/toggle in the canvas → it disables; rail toggle flips to off; iframe re-renders without it.
5. Toggle the new "Edit / Preview" segmented control to **Preview** → all chrome disappears, text becomes inert, page reads like the live site. Toggle back to **Edit** → chrome returns.
6. Refresh editor → choice persists.
7. Undo (Cmd+Z) reverts the last text edit.

## Files to edit

- `src/components/dashboard/website-editor/WebsiteEditorShell.tsx` — drop `mode: 'view'` from the URL builder; pass mode-less base URL to LivePreviewPanel.
- `src/components/dashboard/website-editor/LivePreviewPanel.tsx` — add Edit/Preview segmented toggle, persist in localStorage, append `&mode=…` to iframe src.
- `src/components/dashboard/website-editor/SectionNavItem.tsx` — `scrollIntoView` when `isActive` becomes true.
- `src/components/home/EditorSectionCard.tsx` — `:focus-within` chrome dimming.

Net delta: ~60 lines across 4 files. No new infrastructure, no new message types, no DB changes. We're flipping a switch on a fully-built system.

## Enhancement suggestions (after this lands)

- **Click affordance on first hover.** Show a one-time tooltip/coachmark "Click any text to edit, click anywhere on a section to open it" the first time a user enters edit mode. Drives discoverability.
- **Image click → opens upload/replace modal.** Today images are static in the canvas. Same pattern: wrap them in an `EditableImage` primitive that posts `EDITOR_REPLACE_IMAGE { sectionKey, fieldPath }` upward; shell opens the existing image picker. Adds the third granularity from your prompt.
- **Multi-cursor dirty indicator.** When the iframe is mid-edit AND there are unsaved changes, the rail's matching section row could pulse a 1px primary-tinted left border. Visual confirmation that the canvas and rail are looking at the same record.
- **Keyboard navigation.** `Cmd+E` to toggle Edit/Preview, `Cmd+Up/Down` to step through sections in the rail. Power-user multiplier with no design cost.
