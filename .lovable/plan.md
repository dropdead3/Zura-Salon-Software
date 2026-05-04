## Goal

Make the **Navigation Menus** editor functional so operators can reconfigure the header (and footer) navigation: add/remove items, reorder, nest dropdowns, change item type (page link / external URL / anchor / dropdown / CTA), set visibility (desktop/mobile), choose CTA style, and adjust mobile layout — with versioned publish to the live site.

## Current state (already shipped)

The infrastructure is fully built and wired to the live `<Header />`:

- **Tables**: `website_menus`, `website_menu_items` (with `parent_id` for nesting), `website_menu_versions` (publish snapshots).
- **Hooks** (`src/hooks/useWebsiteMenus.ts`): `useWebsiteMenus`, `useWebsiteMenu`, `useCreateMenuItem`, `useUpdateMenuItem`, `useDeleteMenuItem`, `useReorderMenuItems`, `useUpdateMenuConfig`, `usePublishMenu`, `useSeedMenus`, `usePublicMenuBySlug`.
- **Editor UI** (`src/components/dashboard/website-editor/navigation/`): `NavigationManager`, `MenuTreeEditor` (drag-and-drop tree), `MenuItemNode`, `MenuItemInspector` (type / target page / external URL / anchor / CTA style / visibility / new-tab / tracking key / duplicate / delete), `AddMenuItemDialog`, `MobileNavConfig` (overlay vs drawer + mobile CTA toggle), `MenuPublishBar` (validation + versioned publish), `useMenuValidation`.
- **Live consumption**: `Header.tsx` reads `usePublicMenuBySlug('primary')`, with fallback to hardcoded items if no published menu. Footer pulls `'footer'` slug.

**The only missing wire**: `WebsiteEditorShell.tsx` `BUILTIN_EDITORS` map (line 142) does not include `'navigation'`, so when the sidebar selects that tab the canvas falls through to the "Pick a section to edit" placeholder seen in your screenshot.

## What to build

### 1. Wire `NavigationManager` into the editor shell (the actual fix)

`src/components/dashboard/website-editor/WebsiteEditorShell.tsx`

- Import `NavigationManager` from `./navigation/NavigationManager`.
- Add `navigation: NavigationManager` to the `BUILTIN_EDITORS` record.

That single change makes the existing editor surface in the canvas — operators can immediately reorder, add, edit, nest, and publish menu items.

### 2. Layout controls (extend `MenuConfig` + `MobileNavConfig`)

The current `MenuConfig` only carries `mobile_menu_style` and `mobile_cta_visible`. Add desktop layout knobs:

- `desktop_alignment`: `'left' | 'center' | 'right'` — controls nav cluster alignment in `Header.tsx`.
- `desktop_density`: `'comfortable' | 'compact'` — gap between items.
- `dropdown_style`: `'mega' | 'simple'` — `simple` = current vertical list; `mega` = wider 2-column panel for dropdowns with >5 children.
- `show_logo`: `boolean` — already implicit, expose toggle.
- `cta_treatment`: `'pill' | 'underline' | 'outline'` — header CTA style override.

Files:
- Extend `MenuConfig` interface in `useWebsiteMenus.ts`.
- Add a new `DesktopNavConfig.tsx` panel inside `NavigationManager` (mirrors `MobileNavConfig`), gated to the `'primary'` menu.
- Read these in `Header.tsx` via `menuConfig` and apply with `cn()` class branching.

### 3. Live preview parity (optional but completes the loop)

Hover over a menu item in the editor tree posts `PREVIEW_HOVER_SECTION` with `sectionId: 'header'` so the live preview iframe outlines the header. Cheap reuse of the existing hover bridge.

## Technical details

- The `BUILTIN_EDITORS` value type is `React.ComponentType` (no props). `NavigationManager` already takes no props — drop-in compatible.
- `MenuConfig` is JSONB on `website_menus.config`, so adding fields is additive — no migration required.
- All RLS already exists (org-scoped on both `website_menus` and `website_menu_items`).
- Publish flow already snapshots into `website_menu_versions` with `version_number`, `published_by`, `change_summary` — keep as-is.
- Tenant isolation: all writes go through `useResolvedOrgId()` (effectiveOrganization) — no changes needed.

## Out of scope (call out, don't build)

- A new "menu type" beyond primary/footer (e.g., utility nav, mobile-only nav). Possible but not requested.
- Per-page menu overrides.
- Conditional visibility by auth state (logged-in vs guest).

## Validation checklist

- Open `/dashboard/admin/website-hub?tab=editor` → click **Navigation Menus** → tree renders, items editable.
- Add a dropdown parent, nest two children, drag to reorder — saves and reflects in preview after publish.
- Change CTA style → Header CTA visually updates after publish.
- Toggle mobile menu style overlay ↔ drawer → live mobile preview swaps.
- Switch desktop alignment center → header re-anchors.
