

## Make Website Editor Sidebar Collapsible

Good prompt -- you're thinking about maximizing the editing and preview real estate, which is exactly the right instinct for a high-density editor like this. One refinement for future prompts: specifying "collapsible to icon-only strip" vs "fully hideable" helps disambiguate the behavior upfront.

Currently the sidebar toggle **hides it entirely** (`showSidebar` controls a 0 or 300px container). The improvement is to add a **collapsed state** where the sidebar shrinks to a narrow icon strip (~56px), keeping navigation accessible while giving more room to the editor and live preview.

### Architecture

```text
┌──────────┬──────────────────────┬─────────────────────┐
│ Sidebar  │  Editor Panel        │  Live Preview       │
│ 300px    │  (resizable)         │  (resizable)        │
│  or 56px │                      │                     │
│ (icons)  │                      │                     │
└──────────┴──────────────────────┴─────────────────────┘
```

**Collapsed state** shows only section icons with tooltips. Clicking an icon selects that section and expands the sidebar. A dedicated collapse/expand toggle lives at the bottom of the sidebar.

### Changes

**1. `src/pages/dashboard/admin/WebsiteSectionsHub.tsx`**

- Replace the binary `showSidebar` boolean with a `sidebarMode` state: `'expanded' | 'collapsed' | 'hidden'` (hidden only on mobile).
- Change the sidebar container width from fixed `w-[300px]` to conditional: `w-[300px]` when expanded, `w-14` when collapsed.
- Update the toolbar toggle button: clicking toggles between expanded and collapsed (not hidden) on desktop.
- Persist collapsed state to `localStorage` so it remembers across sessions.

**2. `src/components/dashboard/website-editor/WebsiteEditorSidebar.tsx`**

- Accept and use the existing `collapsed` prop (currently it just returns `null` when collapsed -- change this).
- When `collapsed = true`, render a narrow vertical strip:
  - Site Content items render as icon-only buttons wrapped in `<Tooltip>`.
  - Homepage Layout section shows a small layout icon.
  - Page selector collapses to a page icon.
  - Search collapses to a search icon (clicking expands sidebar).
  - A chevron toggle button at the bottom to expand.
- Add an `onToggleCollapse` callback prop so the sidebar can request expansion.

**3. `src/components/dashboard/website-editor/ContentNavItem.tsx`**

- Add optional `collapsed` prop.
- When collapsed, render icon-only with a `<Tooltip>` showing the label. No text, no description.

### Files Changed
- `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` -- sidebar width logic, toggle behavior, localStorage persistence
- `src/components/dashboard/website-editor/WebsiteEditorSidebar.tsx` -- collapsed icon-strip rendering
- `src/components/dashboard/website-editor/ContentNavItem.tsx` -- collapsed icon-only mode with tooltip

