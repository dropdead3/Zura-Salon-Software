

## Implementation Plan: Drawer Animation, Publish Changelog, SERP Preview

Good prompt -- three clearly scoped, non-overlapping deliverables. One note for future prompts: when a deliverable depends on data from multiple existing systems (like the changelog combining pages + nav), calling that out as a cross-cutting concern helps me identify shared hooks early.

---

### Current State

**Mobile menu (Header.tsx lines 651-703)**: Always renders a full-screen overlay (`opacity: 0, height: 0` → `opacity: 1, height: auto`). The `MobileNavConfig` editor saves `mobile_menu_style` and `mobile_cta_visible` to `website_menus.config` JSONB, but the Header never reads this config. `usePublicMenuBySlug` returns only the menu item tree, not the parent menu record (including `config`).

**Publish flow**: `usePublishMenu` publishes a single menu at a time. Pages use `useUpdateWebsitePages` to save directly -- no publish/draft distinction beyond `enabled: true/false`. No unified changelog exists.

**PageSettingsEditor**: Has SEO title + description fields with character counters, but no visual SERP preview.

---

### Deliverable 1: Drawer Mobile Menu Animation

**Problem**: `usePublicMenuBySlug` only returns menu items, not the menu's `config` column. The Header needs access to `mobile_menu_style` and `mobile_cta_visible`.

**Changes**:

1. **`src/hooks/useWebsiteMenus.ts`** -- Modify `usePublicMenuBySlug` to also return the menu's `config` alongside the tree:
   - Change return type from `MenuItem[] | null` to `{ items: MenuItem[]; config: MenuConfig | null } | null`
   - Select `id, config` from `website_menus` instead of just `id`

2. **`src/components/layout/Header.tsx`**:
   - Update destructuring of `usePublicMenuBySlug` to read `config`
   - Extract `mobileMenuStyle` and `mobileCTAVisible` from config (with defaults: `overlay` and `true`)
   - Split the mobile menu `AnimatePresence` block (lines 652-702) into two variants:
     - **Overlay** (current): `height: 0 → auto`, full-width below header, pushes content
     - **Drawer**: `framer-motion` slide from right (`x: '100%' → 0`), fixed position, full height, `w-[85vw] max-w-sm`, backdrop overlay behind it, close on backdrop click
   - Conditionally render based on `mobileMenuStyle`
   - Respect `mobileCTAVisible` -- hide the CTA button in mobile menu when false
   - Both variants render the same nav items list, just different containers/animations

**Drawer variant specifics**:
```text
┌──────────────────────────────────┐
│ Page content (dimmed backdrop)   │  ┌──────────────┐
│                                  │  │ DRAWER       │
│                                  │  │ [X] Close    │
│                                  │  │              │
│                                  │  │ Services     │
│                                  │  │ About        │
│                                  │  │ Extensions   │
│                                  │  │ Gallery      │
│                                  │  │              │
│                                  │  │ [Book Now]   │
│                                  │  └──────────────┘
└──────────────────────────────────┘
```

Animation: `x: '100%'` → `x: 0` with `duration: 0.3`, spring easing. Backdrop: `bg-black/50` with fade in/out. Uses `framer-motion` (already imported).

---

### Deliverable 2: Unified Publish Changelog

**Approach**: A new component that aggregates pending changes across pages and navigation into a summary dialog before publishing.

**New files**:

1. **`src/components/dashboard/website-editor/PublishChangelog.tsx`**:
   - A Dialog/Sheet component showing a changelog summary
   - Sections:
     - **Navigation changes**: Compare current menu items vs last published snapshot (from `website_menu_versions`). Show added/removed/reordered items per menu.
     - **Page changes**: Compare current `website_pages` config vs the latest `website_page_versions` snapshots. Show new pages, deleted pages, status changes, SEO changes.
   - Each section shows a count badge and expandable list of changes
   - "Publish All" button that:
     1. Publishes all menus (calls `usePublishMenu` for each)
     2. Saves page versions for any changed pages
   - "Cancel" to dismiss without publishing

2. **`src/hooks/usePublishChangelog.ts`**:
   - `useChangelogSummary()` hook that:
     - Fetches latest menu versions and compares against current items
     - Fetches latest page versions and compares against current page configs
     - Returns `{ navChanges: ChangeItem[], pageChanges: ChangeItem[], hasChanges: boolean }`
   - `usePublishAll()` mutation that orchestrates publishing menus + saving page versions

**Integration**:
- **`src/pages/dashboard/admin/WebsiteSectionsHub.tsx`**: Add a "Publish Changes" button in the top toolbar (next to Save/Undo/Redo). Opens the `PublishChangelog` dialog. Button shows a dot indicator when `hasChanges` is true.

---

### Deliverable 3: SERP Preview Card

**What**: A Google search result preview card that renders below the SEO fields in `PageSettingsEditor.tsx`.

**Changes to `src/components/dashboard/website-editor/PageSettingsEditor.tsx`**:

Add a new `SerpPreview` component rendered after the SEO description textarea:

```text
┌────────────────────────────────────────────┐
│ Search Preview                             │
│                                            │
│ getzura.com › your-salon › services        │
│ Services — Your Salon Name                 │
│ Browse our full menu of hair services      │
│ including cuts, color, extensions, and     │
│ styling. Book your appointment today.      │
└────────────────────────────────────────────┘
```

- Title: Uses `seo_title` if set, falls back to `title`. Truncated at 60 chars with ellipsis.
- URL breadcrumb: Renders `getzura.com › org › your-salon › {slug}` in green text, matching Google's actual SERP format.
- Description: Uses `seo_description` if set, falls back to placeholder text. Truncated at 160 chars.
- Styled to match Google's SERP appearance: blue title link, green URL, gray description text.
- Updates live as the user types (reads from `local` state).
- Wrapped in a subtle bordered card with "Search Preview" label.

No new files needed -- this is a self-contained component within `PageSettingsEditor.tsx`.

---

### Files Summary

**New files**:
- `src/components/dashboard/website-editor/PublishChangelog.tsx`
- `src/hooks/usePublishChangelog.ts`

**Modified files**:
- `src/hooks/useWebsiteMenus.ts` -- expand `usePublicMenuBySlug` return type
- `src/components/layout/Header.tsx` -- drawer variant + CTA visibility
- `src/components/dashboard/website-editor/PageSettingsEditor.tsx` -- SERP preview card
- `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` -- Publish Changes button

