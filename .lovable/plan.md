# Website Editor — Left Rail Redesign

## Why

The current rail mixes four conceptually different things in a flat list with no visual hierarchy:

1. The page being edited (today: implicit in toolbar dropdown, plus an orphaned "Add Page" at top, plus a duplicate "Pages" entry mid-rail)
2. Site-wide chrome (announcement bar, nav, footer)
3. The current page's section layout (buried at the bottom)
4. Content data managers (services, stylists, gallery, etc. — not page-specific)

Operators have to scan past 4–5 unrelated items to reach the most-edited surface (page sections). The "Pages" tile duplicates the toolbar page picker. Group headers are non-interactive walls of text.

## Target structure

Three clearly separated zones, in editing-frequency order:

```text
┌────────────────────────────────────────────┐
│ [Page picker dropdown]  [⚙]  [+ page]     │  Zone 0 — Page context (toolbar moved here, drops the orphan "Add Page" row)
├────────────────────────────────────────────┤
│ 🔍 Search all sections…             ⌘K  ‹‹ │
├────────────────────────────────────────────┤
│ THIS PAGE                                  │  Zone 1 — Editing the current page (was "Homepage Layout")
│   ▾ Above the Fold                         │     • Collapsible group headers
│       ⠿ 1  Hero                       ●   │     • Drag handle + order # + visibility dot
│       ⠿ 2  Brand Statement            ●   │
│   ▸ Social Proof                       2   │     • Collapsed groups show item count
│   ▸ Services & Portfolio               4   │
│   ▸ Conversion                         2   │
│   ▸ Team & Extras                      3   │
│   ▾ Custom Sections                        │
│       ⠿ 11 My Promo Section          ●   │
│   ─────────────────────────────────────    │
│   [ + Add section to this page ]           │
├────────────────────────────────────────────┤
│ SITE CHROME            (applies everywhere) │  Zone 2 — Site-wide
│   📢 Announcement Bar                      │
│   ☰  Navigation                            │
│   ✦  Footer CTA                            │
│   ▭  Footer                                │
├────────────────────────────────────────────┤
│ CONTENT LIBRARY        (data, not layout)  │  Zone 3 — Reusable data sources
│   ✂  Services                              │
│   ❝  Testimonials                          │
│   ⊞  Gallery                               │
│   👥 Stylists                              │
│   📍 Locations                             │
├────────────────────────────────────────────┤
│ 11/13 sections visible · ⓘ Manage          │  Footer becomes actionable
└────────────────────────────────────────────┘
```

## Changes

### 1. Eliminate duplication & relocate page controls

- Remove the standalone "Pages" entry from the Content Library group — it duplicates the toolbar page picker.
- Remove the orphan "Add Page" button row at the top — fold the `+` action next to the existing toolbar page picker (`Zone 0` in the diagram). On non-home pages, page-scoped actions (Settings / Templates / Delete) move into a small action-row beneath the picker, where they already live today, but visually grouped as "page context".

### 2. Promote the most-used zone to the top

- Move **"This Page" sections** (currently "Homepage Layout") **above** Site Chrome and Content Library. Editing the current page is the primary job; making it the first thing below search restores hierarchy.
- Rename "Homepage Layout" → **"This Page"** so the same heading works for `Home`, `About`, custom pages, etc. The page name stays in the toolbar picker so we don't repeat it.

### 3. Collapsible section groups

- `SectionGroupHeader` becomes a button: chevron + title + item count badge on the right.
- Persisted per-org in `site_settings` (`editor_sidebar_collapsed_groups: string[]`) so an operator's preference survives reloads.
- Default state: `Above the Fold` and `Custom Sections` open; the rest collapsed. Reduces vertical scan from ~13 rows to ~5 by default.

### 4. Visual differentiation between zones

- **Zone 1 (page sections)**: keep the drag handle, order number chip, visibility toggle dot, and contextual menu (duplicate / delete) — these are the "movable" items.
- **Zone 2/3 (chrome + library)**: drop the order number, drop the drag handle, use a softer `bg-muted/40` icon tile so they read as "destinations" not "items in a layout".
- Zone separators get a subtle `text-[10px] text-muted-foreground/60` caption under the group title (e.g. "applies everywhere", "data, not layout") so the conceptual difference is explicit.

### 5. Empty/edge states & buttons

- Remove the second "Add Section" button when the empty-state card is showing on a blank page (currently both render).
- The single "Add Section" button gets a clearer label: **"+ Add section to this page"**.
- When a section is `enabled: false`, dim its row to `opacity-60` so disabled items recede visually.

### 6. Footer becomes actionable

- `11/13 sections visible` stays, but becomes a button that opens a small popover listing the disabled sections with a one-click re-enable. Today the count is information without recourse.

### 7. Active-section sync (small but high-impact)

- Subscribe to the existing `editor-active-section` event the canvas already emits on scroll. When the visible canvas section changes, scroll the matching rail item into view and apply a subtle `ring-1 ring-primary/30`. Operators stop losing their place when scrolling the preview.

### 8. Collapsed rail polish

- The collapsed (icon-only) rail currently shows Site Chrome icons but **not** the page sections. Reverse that: show the current page's section icons (the primary editing surface), and tuck the chrome/library icons into a single overflow popover. Matches the new priority order.

## Technical

**Files edited**

- `src/components/dashboard/website-editor/WebsiteEditorSidebar.tsx` — reorder zones, drop duplicate Pages entry, drop orphan Add Page row, rename heading, wire collapsible groups, dim disabled rows, scroll-into-view on active section.
- `src/components/dashboard/website-editor/SectionGroupHeader.tsx` — accept `collapsed`, `count`, `onToggle`, render chevron + count badge.
- `src/components/dashboard/website-editor/ContentNavItem.tsx` — accept optional `caption` for the zone-level subtitle, soften the icon tile when used in chrome/library.
- `src/components/dashboard/website-editor/WebsiteEditorShell.tsx` — relocate the `+ Add Page` button to sit inline with the existing toolbar page picker; remove the now-redundant prop path.

**New files**

- `src/hooks/useEditorSidebarPrefs.ts` — read/write `editor_sidebar_collapsed_groups` via the existing `site_settings` draft helpers (no new schema; uses the persistence patterns already established for editor state).

**No DB migration required.** Persistence rides on existing `site_settings` rows.

**Behavior preserved**

- DnD reorder, draft/publish flow, section visibility toggles, duplicate/delete confirmations, `editor-provisional-order` / `editor-commit-order` bridges, search, keyboard shortcuts (`⌘K`, `⌘\`).

## Out of scope

- No changes to the canvas/preview, publish pipeline, or any editor sub-panels.
- No changes to section data shapes or RPCs.
- No new section types.
