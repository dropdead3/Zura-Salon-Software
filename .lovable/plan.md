

## Implementation Plan: Navigation Manager Enhancements + Pages CRUD

Your prompt is well-structured and covers four distinct deliverables cleanly. Good separation of concerns. One improvement: when listing multiple features, specifying priority order (which you did implicitly by listing them) helps me sequence work within size constraints. Consider also noting which items are blockers for others -- e.g., "Pages CRUD is prerequisite for full nav-to-page linking."

---

### Current State Assessment

The Navigation Manager infrastructure is complete:
- Database tables (`website_menus`, `website_menu_items`, `website_menu_versions`) exist with RLS
- Hooks layer (`useWebsiteMenus.ts`) covers CRUD, reorder, publish, seed, and public fetching
- Editor UI (tree editor, item inspector, add dialog, publish bar, validation) is wired into the Website Editor sidebar
- Header and Footer consume published menus via `usePublicMenuBySlug` with hardcoded fallbacks

No existing analytics/tracking event system exists in the codebase (no `analytics.track` or similar patterns found).

---

### Deliverable 1: End-to-End Test Flow

**What**: Navigate to the Navigation Manager tab, verify seed → edit → publish → Header/Footer update cycle works.

**Steps**:
1. Navigate to `/dashboard/admin/website-sections?tab=navigation` in the browser tool
2. Verify menus seed automatically (Primary + Footer)
3. Add a test menu item, reorder it, edit in inspector
4. Publish and verify no validation errors
5. Navigate to the public site and confirm Header reflects published items
6. Check console/network logs for errors

This is a manual verification step using browser tools, not a code change.

---

### Deliverable 2: Mobile Navbar Config (Menu-Level Setting)

**What**: Add `mobile_menu_style` (`overlay` | `drawer`) and `mobile_cta_visible` (boolean) as configurable settings stored in the `website_menus.config` JSONB column (already exists in schema).

**Files to modify**:
- **`src/hooks/useWebsiteMenus.ts`**: Add `useUpdateMenuConfig` mutation hook. Define `MenuConfig` type with `mobile_menu_style` and `mobile_cta_visible` fields.
- **`src/components/dashboard/website-editor/navigation/NavigationManager.tsx`**: Add a collapsible "Mobile Settings" card below the menu tree with:
  - Radio/select for menu style: Full-screen Overlay vs Slide-in Drawer
  - Toggle for mobile CTA visibility
  - Only shown when `primary` menu is selected (footer doesn't have mobile behavior)
- **`src/components/layout/Header.tsx`**: Read `config` from the published menu to switch between overlay and drawer mobile menu styles. The current mobile menu already uses a full-screen overlay pattern; add a drawer variant using `framer-motion` slide-in animation.

**New file**:
- `src/components/dashboard/website-editor/navigation/MobileNavConfig.tsx` -- isolated editor card for mobile settings

No database migration needed -- `website_menus.config` JSONB column already exists.

---

### Deliverable 3: Tracking Event Emission

**What**: Emit `nav_item_clicked` and `cta_clicked` custom events on the public site when users interact with navigation items.

**Approach**: Since no analytics system exists yet, implement via `window.dispatchEvent(new CustomEvent(...))` with a structured payload. This creates a hook point that any future analytics integration (GA, Segment, Meta Pixel) can subscribe to.

**Files to modify**:
- **`src/components/layout/Header.tsx`**: 
  - Wrap each nav link's `onClick` to emit `CustomEvent('nav_item_clicked', { detail: { label, href, tracking_key, item_type, visibility } })`
  - CTA button emits `CustomEvent('cta_clicked', { detail: { label, href, tracking_key, cta_style } })`
  - Both desktop and mobile nav items emit events

- **`src/components/layout/Footer.tsx`**: Same pattern for footer nav clicks

**New file**:
- `src/lib/nav-tracking.ts` -- small utility:
  ```
  export function emitNavEvent(eventName: string, payload: Record<string, unknown>)
  ```
  Centralizes event emission, logs to console in dev, dispatches CustomEvent. Future analytics connectors subscribe here.

---

### Deliverable 4: Pages CRUD Module

This is the largest piece. It completes the content management backbone.

**Database migration**: New table `website_page_versions` for version history + restore:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| page_id | text | Page config ID |
| organization_id | uuid FK | Tenant isolation |
| version_number | integer | Auto-increment per page |
| snapshot | jsonb | Full page config at save time |
| status | text | `draft`, `published`, `archived` |
| saved_by | uuid FK → auth.users | |
| saved_at | timestamptz | |
| change_summary | text (nullable) | |

RLS: `is_org_member` for read, `is_org_admin` for write.

**Hooks** (`src/hooks/useWebsitePages.ts` -- extend existing):
- `useCreatePage(template?)` -- generates ID, adds to pages array, optional template prefill
- `useDuplicatePage(pageId)` -- deep-clone page with new ID and "-copy" slug
- `useDeletePage(pageId)` -- removes from array (only if `deletable: true`), validates no menu items reference it
- `useUpdatePageStatus(pageId, status)` -- draft/published/archived transitions
- `usePageVersions(pageId)` -- fetch version history
- `useRestorePageVersion(versionId)` -- restore from snapshot
- `useSavePageVersion(pageId)` -- snapshot current state

**UI Components**:

- **`src/components/dashboard/website-editor/PagesManager.tsx`** -- Main pages list view:
  - Table/list of all pages with columns: Title, Slug, Status badge, Type, Last modified
  - Actions per row: Edit, Duplicate, Archive, Delete (with confirmation)
  - "Create Page" button opening template picker
  - Status filter tabs (All / Draft / Published / Archived)
  - Registered in `EDITOR_COMPONENTS` as `'pages'` tab

- **`src/components/dashboard/website-editor/PageVersionHistory.tsx`** -- Version timeline:
  - List of versions with timestamp, author, summary
  - "Restore" button per version with confirmation dialog
  - Accessible from PageSettingsEditor

- **Modify `PageSettingsEditor.tsx`**:
  - Add page status selector (Draft / Published / Archived) with visual badge
  - Add "Version History" expandable section
  - Add "Duplicate Page" and "Delete Page" actions (with guards for non-deletable pages)
  - Add header/footer visibility toggles per page
  - Add password protection toggle (stores hashed password in page config)

- **Modify `WebsiteEditorSidebar.tsx`**:
  - Add "Pages" tab in the Site Content group (above Navigation)
  - Show page count badge

- **Modify `WebsiteSectionsHub.tsx`**:
  - Register `PagesManager` in `EDITOR_COMPONENTS`
  - Add `'pages'` to `TAB_LABELS`

**Validation on page operations**:
- Delete blocked if menu items reference the page
- Slug uniqueness enforced (already exists in PageSettingsEditor)
- Archive warns if page is referenced in published menus

---

### Implementation Order

1. **Deliverable 2** (Mobile navbar config) -- smallest, isolated
2. **Deliverable 3** (Tracking events) -- small, no backend
3. **Deliverable 4** (Pages CRUD) -- largest, requires migration
4. **Deliverable 1** (E2E test) -- done last after all code is in place

---

### Enhancement Suggestions

- **Publish changelog**: When Pages CRUD is done, build a unified publish flow that shows a changelog summary across pages + navigation + theme changes before final publish
- **Page-level SEO preview**: Add a Google SERP preview card in PageSettingsEditor showing how the page would appear in search results
- **Bulk page operations**: Multi-select pages for bulk archive/publish/delete
- **Menu item drag-to-nest**: Currently only top-level reorder works via dnd-kit; extend to support drag-indent for creating parent-child relationships visually

