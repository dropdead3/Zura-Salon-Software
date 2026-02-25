

## Navigation Manager -- Full Architecture Plan

### Current State

The public site Header (`src/components/layout/Header.tsx`) hardcodes `NAV_LINKS` and `ABOUT_LINKS` arrays. The Footer hardcodes `FOOTER_LINKS`. Dynamic pages from `useWebsitePages` are appended to the header nav, but there's no structured menu system -- no reordering, no nesting control, no CTA styling, no mobile-specific visibility, no validation.

### Database Schema

Three new tables with RLS, plus a helper function:

**`website_menus`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| organization_id | uuid FK → organizations | Tenant isolation |
| slug | text | `primary`, `footer`, `secondary` |
| name | text | Display name |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| UNIQUE | (organization_id, slug) | |

**`website_menu_items`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| menu_id | uuid FK → website_menus ON DELETE CASCADE | |
| organization_id | uuid FK → organizations | For RLS |
| parent_id | uuid FK → website_menu_items (nullable) | Nesting (max depth 2) |
| label | text | Display text |
| item_type | text | `page_link`, `external_url`, `anchor`, `dropdown_parent`, `cta` |
| target_page_id | text (nullable) | References page config ID |
| target_url | text (nullable) | For external links |
| target_anchor | text (nullable) | For anchor links |
| open_in_new_tab | boolean default false | |
| cta_style | text (nullable) | `primary`, `secondary`, `ghost` |
| tracking_key | text (nullable) | Analytics hook |
| icon | text (nullable) | Lucide icon name |
| sort_order | integer default 0 | |
| visibility | text default `both` | `both`, `desktop_only`, `mobile_only` |
| is_published | boolean default false | Draft vs live |
| created_at / updated_at | timestamptz | |

**`website_menu_versions`** (audit + rollback)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| menu_id | uuid FK → website_menus | |
| organization_id | uuid FK | For RLS |
| version_number | integer | Auto-increment per menu |
| snapshot | jsonb | Full menu_items array at publish time |
| published_by | uuid FK → auth.users | |
| published_at | timestamptz | |
| change_summary | text (nullable) | |

RLS on all three tables using existing `is_org_member` (read) and `is_org_admin` (write) helpers.

Seed data: On first load (no menus found), the hook auto-creates `primary` and `footer` menus with items matching the current hardcoded links, so existing sites don't break.

### Hooks Layer

**`src/hooks/useWebsiteMenus.ts`**
- `useWebsiteMenus(orgId)` -- fetch all menus for org
- `useWebsiteMenu(menuSlug)` -- fetch single menu with items (ordered, nested)
- `usePublishedMenu(orgId, menuSlug)` -- fetch published snapshot for public rendering
- `useUpdateMenuItem` -- CRUD single item
- `useReorderMenuItems` -- batch sort_order update
- `usePublishMenu` -- validates, snapshots, sets `is_published = true`
- `useMenuValidation(menuId)` -- returns errors/warnings for publish gating

### Validation Engine

Before publish, run these checks:

**Errors (block publish):**
- Menu item targets a page ID that doesn't exist in `website_pages`
- Menu item targets a disabled/archived page
- Nesting depth exceeds 2
- CTA item count exceeds 2
- External URL missing `https://`
- Empty label

**Warnings (allow publish):**
- Label longer than 30 characters
- More than 8 top-level items
- Meaningless link text ("Click here", "Link")
- Duplicate labels at same level

### Navigation Manager UI

New tab in the Website Editor sidebar: **"Navigation"** (between Site Content and Homepage Layout groups).

```text
┌─────────────────────────────────────────────────┐
│  NAVIGATION MANAGER                             │
│                                                 │
│  ┌──────────────────┐  ┌──────────────────────┐ │
│  │ Menu Tree (Left) │  │ Item Inspector (Right)│ │
│  │                  │  │                       │ │
│  │ [Primary Menu]   │  │ Label: [Services    ] │ │
│  │  ├ Services      │  │ Type:  [Page Link ▼ ] │ │
│  │  ├ About ▾       │  │ Target: [/services ▼] │ │
│  │  │  ├ About Us   │  │ New tab: [ ]          │ │
│  │  │  └ Policies   │  │ Visibility: [Both ▼]  │ │
│  │  ├ Extensions    │  │ CTA Style: [—]        │ │
│  │  ├ Gallery       │  │ Tracking: [         ] │ │
│  │  └ ★ Book Now    │  │                       │ │
│  │                  │  │ [Delete Item]         │ │
│  │ [+ Add Item]     │  │                       │ │
│  │                  │  └──────────────────────┘ │
│  │ [Footer Menu]    │                           │
│  │  ├ Services      │  ┌──────────────────────┐ │
│  │  └ Book          │  │ PUBLISH               │ │
│  │                  │  │ ⚠ 1 warning           │ │
│  │ [+ Add Item]     │  │ ✓ 0 errors            │ │
│  └──────────────────┘  │ [Publish Navigation]  │ │
│                        └──────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Left panel:** Menu selector (tabs or dropdown for Primary/Footer). Tree with drag-drop reorder using `@dnd-kit`. Items show type icon, label, and status badges (⚠ broken link, ★ CTA). Drag to nest (indent) creates parent-child. "Add Item" opens a picker: choose existing page (searchable), external URL, or dropdown parent.

**Right panel (Inspector):** Selected item's settings. Fields adapt by `item_type`. CTA items show style variant picker. Visibility toggle (desktop/mobile/both). Tracking key input.

**Bottom bar:** Validation summary + Publish button. Errors block, warnings inform.

### Mobile Navbar Controls

A collapsible section in the Navigation Manager for mobile-specific settings:
- Mobile menu style: `overlay` vs `drawer` (stored in `website_menus.config` jsonb or a site_setting)
- Mobile CTA visibility toggle
- Per-item `visibility` field already handles desktop/mobile filtering

### Public Site Integration

**`Header.tsx` changes:**
- Replace hardcoded `NAV_LINKS`, `ABOUT_LINKS`, and dynamic page append logic
- Call `usePublishedMenu('primary')` to get the published menu tree
- Render items from the menu data, respecting `visibility`, `item_type`, nesting, and `cta_style`
- Items with `item_type === 'dropdown_parent'` render the existing dropdown UI
- CTA items render with distinct button styling (existing "Book Now" pattern)
- Responsive hiding logic adapts to menu item count dynamically

**`Footer.tsx` changes:**
- Replace hardcoded `FOOTER_LINKS`
- Call `usePublishedMenu('footer')` to render footer nav links

**Fallback:** If no published menu exists, render the current hardcoded links (zero-downtime migration).

### Files to Create/Modify

**New files:**
- `src/hooks/useWebsiteMenus.ts` -- all hooks
- `src/components/dashboard/website-editor/navigation/NavigationManager.tsx` -- shell
- `src/components/dashboard/website-editor/navigation/MenuTreeEditor.tsx` -- left panel
- `src/components/dashboard/website-editor/navigation/MenuItemInspector.tsx` -- right panel
- `src/components/dashboard/website-editor/navigation/MenuItemNode.tsx` -- tree node
- `src/components/dashboard/website-editor/navigation/AddMenuItemDialog.tsx` -- item picker
- `src/components/dashboard/website-editor/navigation/MenuPublishBar.tsx` -- validation + publish
- `src/components/dashboard/website-editor/navigation/useMenuValidation.ts` -- validation logic

**Modified files:**
- `src/components/dashboard/website-editor/WebsiteEditorSidebar.tsx` -- add Navigation tab
- `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` -- register NavigationManager component
- `src/components/layout/Header.tsx` -- consume published menu
- `src/components/layout/Footer.tsx` -- consume published menu

**Database migration:** Create `website_menus`, `website_menu_items`, `website_menu_versions` tables with RLS policies.

### Phasing Note

This plan covers Phase 1 (simple dropdowns, full CRUD, publish flow, validation). The `website_menu_items` schema already supports Phase 2 mega menus via additional columns (e.g., `mega_menu_columns` jsonb) without rewrite. Conditional visibility (logged-in vs logged-out) can be added later via a `visibility_rules` jsonb column.

### What This Does NOT Include (Future Prompts)
- Pages CRUD (create/duplicate/delete/archive) with version history
- Theme/Design System editor
- Full publish flow with changelog across pages + nav + theme
- Permissions + audit log system
- SEO/accessibility audit tooling

