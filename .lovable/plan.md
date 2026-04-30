## Website Editor Audit — Findings & Plan

The editor shell is solid (persistence, shortcuts, breadcrumb, resizable panes), but five real problems remain. Below is what's wrong and exactly what to change.

---

### Findings

**1. Page management is silently broken from the editor entrypoint.**
`WebsiteEditorShell` renders `<WebsiteEditorSidebar>` with only 5 props. The sidebar exposes `onAddPage`, `onDeletePage`, `onApplyPageTemplate`, `onPageSectionToggle/Reorder/Delete/Duplicate/Add` — all undefined. So:
- "+ Add Page" button does nothing.
- "Page Settings", "Templates", trash icons on non-home pages are no-ops.
- Dragging/toggling/duplicating sections on any non-home page silently fails.
- Selecting a non-home page leads to a dead "Pick a section to edit" state because `EDITOR_COMPONENTS` has no entry for `custom-*`, `pages`, `navigation`, or `page-settings` tabs.

**2. Toolbar is overweight and duplicates labels.**
Top row has Page picker + breadcrumb + 5 buttons (Hide Canvas, History, Discard, Publish + count, Open Public Site). Then the canvas sub-header repeats "Editing X" plus a shortcut crib. The breadcrumb already says the same thing — three places, one signal.

**3. No click-to-edit from the live canvas.**
`EditorSectionCard` posts `EDITOR_SELECT_SECTION`, `EDITOR_TOGGLE_SECTION`, `EDITOR_DUPLICATE_SECTION`, `EDITOR_DELETE_SECTION` from inside the iframe — but `LivePreviewPanel` never listens. The canvas is read-only, so users still navigate via sidebar even though the visual affordances suggest otherwise. Conversely, picking a section in the sidebar scrolls the iframe (good) but never highlights a corresponding card (no two-way binding).

**4. No unsaved-changes safety net.**
`useEditorDirtyState` and `useEditorSaveAction` exist but aren't wired in `WebsiteEditorShell`. Switching pages, sections, or tabs while a per-section editor has unsaved input loses changes silently. There's also no autosave/last-saved indicator.

**5. Empty state hides the only path forward, and loading is jarring.**
- The "Pick a section" empty state appears whenever a tab has no `EDITOR_COMPONENTS` mapping (e.g. `pages`, `navigation`, `page-settings`, `custom-*`). It looks like a bug.
- Per-section editors mount without a skeleton; the canvas blanks then snaps in.
- Mobile: Live Canvas is hidden, but the sidebar is also hidden (`!isMobile` guard) so the editor canvas is *just* the section editor — no way to open sections on a phone.

---

### Plan

**A. Wire page management + non-home sections (fixes Finding 1)**
- Lift page CRUD + per-page section operations out of `WebsiteSettingsContent`'s old structure into `WebsiteEditorShell`. Add handlers backed by `useWebsitePages` mutations:
  - `handleAddPage` → opens `PageTemplatePicker` modal, creates page, switches to it.
  - `handleDeletePage` → confirm dialog, deletes, falls back to `home`.
  - `handlePageSectionToggle/Reorder/Delete/Duplicate/Add` → `useUpdateWebsitePages` patches.
- Extend `EDITOR_COMPONENTS` with:
  - `pages` → `PagesManager`
  - `page-settings` → `PageSettingsEditor`
  - `custom-*` → resolves to `CustomSectionEditor` keyed by section id.
- Add a `PageTemplatePicker` modal trigger inside the shell (`onApplyPageTemplate`).

**B. Slim and reorganise the toolbar (fixes Finding 2)**
- Top toolbar (left → right): Page picker · breadcrumb · spacer · status pill (`Saved 2s ago` / `N unpublished`) · primary `Publish` (with count badge) · overflow `⋯` menu containing History, Discard, Open Public Site, Live Canvas toggle, Sidebar toggle.
- Remove the canvas sub-header's "Editing X" string and shortcut crib (breadcrumb already shows the section; expose shortcuts via a `?` keyboard-help dialog reused from `useKeyboardShortcuts`).
- Demote `Live Canvas` and `Sidebar` toggles to icon-only buttons inside the canvas pane gutter (where they belong contextually).

**C. Click-to-edit + two-way selection (fixes Finding 3)**
- In `LivePreviewPanel`, add a `window.addEventListener('message')` filtered by `previewOrigin` that handles:
  - `EDITOR_SELECT_SECTION` → calls a new `onSelectSection` prop → `setEditorTab(tabFor(sectionId))`.
  - `EDITOR_TOGGLE_SECTION` / `EDITOR_DUPLICATE_SECTION` / `EDITOR_DELETE_SECTION` → forwarded to shell handlers (already implemented in sidebar).
- After `setEditorTab`, post a `PREVIEW_HIGHLIGHT_SECTION` message back to the iframe so the matching `EditorSectionCard` shows the selected ring — closes the loop.

**D. Unsaved-changes guard + save status (fixes Finding 4)**
- In `WebsiteEditorShell`, listen for the existing `editor-dirty-state` and `editor-saving-state` events.
- Track `dirty`, `saving`, `lastSavedAt` in shell state.
- When `dirty && (changing tab || page || closing canvas)`: open an `AlertDialog` ("Save changes to X before leaving?") with Save / Discard / Cancel. Save dispatches `editor-save-request`.
- Render a status pill in the toolbar: `Saving…` (spinner), `Saved · 12s ago` (relative timer), `Unsaved changes` (amber dot).

**E. Empty/loading/mobile polish (fixes Finding 5)**
- Replace the global "Pick a section" empty state with a per-tab fallback: when a tab maps to a manager (`pages`, `navigation`), render that manager directly; never show the "pick a section" copy unless `editorTab` truly has no resolution.
- Add `<EditorSkeletons />` (already exists) inside a `Suspense` wrapper around `EditorComponent` so swaps don't flash.
- Mobile: replace the hidden sidebar with a `Sheet` triggered by a "Sections" button in the toolbar; keep Live Canvas off by default but expose a "Preview" link that opens the iframe URL in a new tab.

---

### Files Changed

- `src/components/dashboard/website-editor/WebsiteEditorShell.tsx` — page handlers, expanded `EDITOR_COMPONENTS`, dirty-state guard, save-status pill, slimmer toolbar with overflow menu, message bridge to canvas, mobile Sheet sidebar.
- `src/components/dashboard/website-editor/LivePreviewPanel.tsx` — `postMessage` listener, `onSelectSection` prop, two-way highlight.
- `src/components/dashboard/website-editor/WebsiteEditorSidebar.tsx` — minor: ensure `pages` / `navigation` / `page-settings` tabs are emitted consistently; no API changes.
- `src/components/dashboard/website-editor/PagesManager.tsx` and `PageSettingsEditor.tsx` — confirm exported component shape; small adapter if props differ from the registry signature.
- `src/components/home/EditorSectionCard.tsx` — accept inbound `PREVIEW_HIGHLIGHT_SECTION` to drive `isSelected`.

### Out of Scope (next wave)
- Undo/redo stack across sections.
- Inline canvas editing (text-in-place).
- Section-level versioning UI (diff view in History panel).

Confirm and I'll implement A→E in that order.