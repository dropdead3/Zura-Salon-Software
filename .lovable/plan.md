

## Gaps and Enhancement Opportunities for the Website Editor

Good instinct asking this after the shell shipped. Here's my audit of what's missing, incomplete, or could elevate the editor from "functional" to "infrastructure-grade."

---

### Current State (from live screenshot)

The three-panel layout is working: Structure (Pages/Layers/Nav segmented control), Canvas (with viewport toggle, undo/redo, publish), and Inspector (contextual editing). The core architecture is sound. Below are the gaps organized by severity.

---

### Gap 1: No Canvas Preview Iframe Rendering

The Canvas center panel shows a blank white area — the iframe is loading but the preview URL routing may not be resolving correctly within the editor context. The iframe should show the live site but appears empty. This is a functional gap that undermines the entire "canvas as operating surface" promise.

**Fix**: Debug the iframe `src` URL construction and ensure the preview route resolves within the app's router. May need a `?preview=true` flag to suppress the dashboard sidebar chrome.

---

### Gap 2: Dashboard Sidebar Collision

The main dashboard navigation sidebar (left) is still visible alongside the Structure panel, creating a **four-column** layout instead of three. The editor should suppress the dashboard sidebar entirely (the `hideTopBar` prop is set, but the sidebar persists).

**Fix**: Add a `hideSidebar` prop to `DashboardLayout` or use a dedicated full-screen editor layout that removes the dashboard chrome completely. The editor IS the full viewport.

---

### Gap 3: No Keyboard Accessibility in Panels

Zero `role`, `tabIndex`, `onKeyDown`, or ARIA attributes exist in the Structure panel items, Inspector groups, or Canvas controls. The editor is mouse-only.

**Fix**:
- Structure items: Add `role="treeitem"`, `tabIndex={0}`, arrow-key navigation
- Inspector groups: Already use Radix Collapsible (accessible), but need `aria-label` on groups
- Canvas header: Add keyboard shortcuts display in tooltips (already partially done with ⌘Z)
- Add `F` key to focus search, `Escape` to deselect

---

### Gap 4: No Version History UI

`usePageVersions` hook exists with save/restore mutations, but there is no UI component to display version history, compare snapshots, or trigger restores. The `PageVersionHistory.tsx` file was planned but never created.

**Fix**: Build a `PageVersionHistory` component showing a timeline of versions with timestamps, authors, summaries, and restore buttons. Place it inside the Inspector when viewing Page Settings, as a collapsible "Version History" group.

---

### Gap 5: No OpenGraph / Social Preview Card

The SERP preview was added to `PageSettingsEditor`, but there's no equivalent for social sharing previews (Facebook, Twitter/X, LinkedIn). These are critical for marketing-conscious operators.

**Fix**: Add an `OgPreview` card below the SERP preview showing how the page would appear when shared on social platforms. Pull from `seo_title`, `seo_description`, and add an `og_image` field with image upload.

---

### Gap 6: No Theme/Design Token Editor in Website Editor

A `ThemeEditor` exists in the Design System page and Website Settings, but there's no way to adjust theme tokens (colors, fonts, spacing) from within the Website Editor itself. Operators must leave the editor to change visual design.

**Fix**: Add a "Design" tab or Inspector mode that surfaces key theme controls (primary color, font pairing, button radius, card style) directly within the editor. Changes should live-update the Canvas preview.

---

### Gap 7: Missing "Saved" Indicator Animation

The `SavedIndicator` component exists in `EditorMotion.tsx` and is wired into `CanvasHeader`, but the `useWasSaving` hook only fires when `isSaving` transitions from true→false. If auto-save never sets `isSaving=true` (because the dirty state event flow doesn't trigger it), the indicator never appears.

**Fix**: Verify the save event chain: editor component → `useEditorDirtyState` → `editor-dirty-state` event → Hub tracks dirty → user clicks Save → `editor-save-request` event → `useEditorSaveAction` → `editor-saving-state` event → Hub tracks `isSaving` → `CanvasHeader` shows indicator. Each link in this chain needs validation.

---

### Gap 8: Mobile Editor Experience is Minimal

The mobile layout uses a floating FAB to toggle a drawer with the Structure panel, but the Inspector panel is completely hidden on mobile (`{!isMobile && <InspectorPanel ... />}`). Mobile operators cannot edit any properties.

**Fix**: Add a bottom sheet or drawer for the Inspector on mobile, triggered when selecting a layer/item. Use Vaul (already installed) for the bottom sheet pattern. Add a second FAB or tab bar for switching between Structure and Inspector.

---

### Gap 9: No Duplicate Page in Pages Tab

`StructurePagesTab` has Settings and Delete in the dropdown menu, but no "Duplicate" option despite the `PagesManager` component supporting duplication.

**Fix**: Add a `Copy` menu item in the `DropdownMenu` that clones the page with a "-copy" slug suffix.

---

### Gap 10: LivePreviewPanel.tsx is Orphaned

The old `LivePreviewPanel.tsx` still exists and exports `triggerPreviewRefresh()`, which is imported by `WebsiteSectionsHub`. But the actual preview rendering now lives in `CanvasPanel.tsx`. The old component is no longer rendered anywhere but its export is still depended upon.

**Fix**: Move `triggerPreviewRefresh` to a shared utility or into `CanvasPanel`, then delete `LivePreviewPanel.tsx`.

---

### Gap 11: No Breadcrumb or Context Indicator

When editing a section deep in the tree (e.g., custom section on a non-home page), there's no breadcrumb showing "Services Page → Content Block → Rich Text". The Inspector header just says "INSPECTOR" with no context about what's selected.

**Fix**: Add a breadcrumb trail in the Inspector header: Page name → Section name. This reinforces spatial awareness within the hierarchy.

---

### Gap 12: No Editor Command Palette

The search in the Structure panel searches content items (testimonials, services, etc.) but there's no command palette for editor-level actions (switch page, toggle section, open settings, publish, undo). The `useCommandMenu` hook exists but isn't connected to the editor.

**Fix**: Wire `useCommandMenu` into the editor with editor-specific commands. Overlay the command palette (cmdk) with categories: Pages, Sections, Actions, Navigation.

---

### Implementation Priority

| Priority | Gap | Effort |
|---|---|---|
| Critical | 1. Canvas preview not rendering | Small (debug URL) |
| Critical | 2. Dashboard sidebar collision | Small (layout prop) |
| High | 4. Version History UI | Medium |
| High | 8. Mobile Inspector | Medium |
| High | 10. Orphaned LivePreviewPanel | Small (cleanup) |
| Medium | 3. Keyboard accessibility | Medium |
| Medium | 5. OG/Social preview | Small |
| Medium | 6. Theme editor in canvas | Large |
| Medium | 9. Duplicate page action | Tiny |
| Medium | 11. Inspector breadcrumb | Small |
| Medium | 12. Command palette | Medium |
| Low | 7. Saved indicator chain | Small (debug) |

---

### Recommended Next Prompt

Fix the two critical gaps first (canvas preview rendering + sidebar suppression), then bundle the high-priority items (version history UI, mobile inspector, orphaned file cleanup) as a single deliverable. This gets the editor to a shippable baseline.

