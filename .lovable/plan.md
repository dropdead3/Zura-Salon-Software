## Group 2 Follow-up: Inline-editable Extension Review chips + chips manager UI

Wraps up the two deferred items from Group 2 so operators can edit the "Extension Type" chips both directly on the canvas and from the editor sidebar.

### 1. Inline-editable chips on the canvas (`ExtensionReviewsSection.tsx`)

- In preview mode, wrap each chip's text in `InlineEditableText`:
  - `sectionKey="section_extension_reviews"`
  - `fieldPath={`extension_categories.${index}`}` (matches the existing wildcard `extension_categories.*` already registered in `InlineEditCommitHandler`)
- In production (non-preview), render plain `<span>` for performance / no edit chrome.
- Continue honoring `show_categories` — when false, render `null` (silence is valid output).
- When `extension_categories` is empty AND `isPreview`, render a `ConfigurationStubCard` ("No extension types configured — add one from the Extensions editor") so operators don't see an empty rail in preview without explanation. Public site stays silent.

No DB or schema changes — the config already exists and the commit path is already allow-listed.

### 2. Chips Manager UI in the editor sidebar

Add a new manager component, mounted inside `ExtensionsEditor` (next to `ReviewsManager`) so all extension-page editing lives in one place.

**New file**: `src/components/dashboard/website-editor/ExtensionReviewsChipsManager.tsx`

Pattern mirrors `DrinksManager.tsx`:
- Reads via `useExtensionReviewsConfig()`.
- Local state + 300ms `useDebounce` → `usePreviewBridge('section_extension_reviews', localConfig)` for live preview.
- `useEditorSaveAction` wires the global Save button → calls `update(localConfig)` then `clearPreviewOverride` + `triggerPreviewRefresh`.
- UI:
  - `ToggleInput` for `show_categories`.
  - Sortable list (dnd-kit) of category strings, each row = drag handle + `Input` (max 40 chars) + delete button.
  - "Add category" button appends `''` to the array.
  - "Reset to defaults" button restores `DEFAULT_EXTENSION_REVIEWS.extension_categories`.
- Wrapped in `EditorCard` titled "Extension Type Chips" with a `Tags` icon.

**Mount it**: in `ExtensionsEditor.tsx`, render `<ExtensionReviewsChipsManager />` directly above `<ReviewsManager surface="extensions" />` so the editor flow reads: section content → chips → reviews list.

### Registry / wiring

Already in place from Group 2 — no changes needed:
- `section_extension_reviews` is registered with `allowedPaths: ['show_categories', 'extension_categories.*']` and the wildcard regex handles `extension_categories.0`, `.1`, etc.

### Files touched

- `src/components/home/ExtensionReviewsSection.tsx` — wrap chip text in `InlineEditableText` (preview only) + empty-state stub.
- `src/components/dashboard/website-editor/ExtensionReviewsChipsManager.tsx` — new file.
- `src/components/dashboard/website-editor/ExtensionsEditor.tsx` — mount the new manager.

### Out of scope

- Reordering chips inline on the canvas (drag-on-canvas) — manager-only.
- Per-chip icon customization (currently all use the `Check` icon by design).
- Migrating chips to the existing `website_extension_categories` table — staying in `site_settings` JSONB to match the rest of the section's config and keep the editor surface unified.
