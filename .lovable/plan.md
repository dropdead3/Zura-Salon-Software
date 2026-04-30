
# Website Hub UX Redesign — Wave 1

## What's wrong today

1. **"Edit" lands on a configurator, not an editor.** Section/page editor only opens when `&openEditor=1` is also present. "Sections & Content" hub card and sidebar entry route to the **Theme** picker instead of an immersive editor.
2. **The "General" tab is a dumping ground.** Mixes Custom Domain, Announcement Banner, and Social Links — three unrelated concerns.
3. **Hub overview duplicates the editor sidebar.** Pages, Sections, Footer, Announcement, Theme already exist as nav items inside `WebsiteEditorSidebar`, then re-appear as standalone cards.
4. **Editor sidebar "Site Content" is a flat 10-item list.** No grouping, no hierarchy.
5. **Live preview defaults OFF.** An "immersive editor" without a canvas is a form.
6. **Hub cards are dumb.** No status, no signal of what's enabled or pending.

## Target IA

```text
Website Hub (overview cards — status-aware)
├── Editor              ← immersive: pages + sections + live preview ON by default
│     sidebar groups: Site Chrome · Pages · Content Library · Homepage Layout
├── Theme & Branding    ← active theme, library, color, fonts
├── Online Booking      ← (unchanged)
├── Online Store        ← (renamed from Retail)
├── Domain              ← custom domain (moved out of General)
├── SEO & Legal         ← (unchanged)
└── Integrations        ← Social Links + future pixels surface
```

## Changes

### 1. Tabs: rename, re-order, default to Editor

In `WebsiteSettingsContent.tsx`:
- New tab order: **Editor • Theme • Booking • Store • Domain • SEO • Integrations**
- Remove `General` tab; split its three pieces:
  - Domain card → new **Domain** tab (uses existing `DomainConfigCard`)
  - Announcement Banner → moves into the **Editor** under Site Chrome (already wired via `AnnouncementBarContent`)
  - Social Links → new **Integrations** tab
- `editor` becomes the default tab.

### 2. Make "Editor" the default, immersive entry

- Extract the editor shell (sidebar + canvas + live preview) currently nested inside `ThemeTab`'s "editor mode" into a new standalone component:
  - `src/components/dashboard/website-editor/WebsiteEditorShell.tsx`
- The toolbar (Publish, History, Discard, Open Site, Preview) moves with it.
- `ThemeTab` returns to its proper job: pick a theme, manage library, tweak global tokens. Its "Customize" button switches the URL `?tab=editor` instead of swapping into editor mode in place.
- **Live preview defaults ON for desktop ≥1280px** (`showPreview = true`); mobile stays off.

### 3. Editor sidebar: group "Site Content"

Today: 10 items in a flat list. Group using existing `SectionGroupHeader`:
- **Site Chrome** — Announcement Bar, Navigation, Footer CTA, Footer
- **Pages** — Pages manager
- **Content Library** — Services, Testimonials, Gallery, Stylists, Locations

`SITE_CONTENT_ITEMS` constant in `WebsiteEditorSidebar.tsx` becomes a grouped structure; render loop walks groups.

### 4. Promote the page picker into the editor toolbar

Today the "Editing Page" Select sits inside the sidebar header — invisible when collapsed. Move it to the editor toolbar (left side, next to the breadcrumb), keep a read-only label echo in the collapsed sidebar. Always visible, always operable.

### 5. Toolbar copy disambiguation

- `Preview` → **Live Canvas** (toggles inline panel, panel icon)
- `Open Site` → **Open Public Site** (`ExternalLink` icon)

### 6. Hub overview redesign with live status

In `WebsiteHub.tsx`, replace the four-category grid with a flat status-aware grid:

| Card | Status line (from existing hooks) |
|---|---|
| **Edit Website** → `?tab=editor` | "N unpublished changes" badge + inline **Publish** action when `useChangelogSummary().hasChanges` |
| **Theme & Branding** → `?tab=theme` | "Active: {activeTheme.name}" |
| **Online Booking** → `?tab=booking` | "Enabled · 15 min buffer" or "Disabled" |
| **Online Store** → `?tab=store` | "Enabled · N products visible" or "Disabled" |
| **Domain** → `?tab=domain` | "yourdomain.com" or "Using default" |
| **SEO & Legal** → `?tab=seo` | "GA4 connected · Cookie consent on" or "Not configured" |
| **Integrations** → `?tab=integrations` | "N social links connected" |
| **Preview Site** (external) | host shown as badge |

Drops the misleading "Sections & Content" and "Pages" cards (their job is the Editor).

### 7. Persist last-used editor state

Save `selectedPageId` + `editorTab` + `showPreview` to `localStorage` keyed by org id (`zura.websiteEditor.${orgId}`). Returning operators land back where they left off.

### 8. Back-compat redirects

Single normalization pass at the top of `WebsiteSettingsContent`:
- `?tab=general` → `?tab=domain`
- `?tab=retail` → `?tab=store`
- `?openEditor=1` (with or without `&tab=theme`) → `?tab=editor`

Per Hub-landings canon: redirects always re-enter through the hub overview, never auto-open the editor unless the user clicked an editor-bound CTA.

### 9. Sidebar entry behavior

Existing sidebar "Website Hub" link continues to land on the hub overview. The unpublished-changes dot on the sidebar nav stays as built.

## Technical notes

**Files to edit:**
- `src/pages/dashboard/admin/WebsiteHub.tsx` — new status-aware card grid; drop deep-link short-circuit.
- `src/components/dashboard/settings/WebsiteSettingsContent.tsx` — tab restructure; new `EditorTab`, `DomainTab`, `IntegrationsTab`; remove `GeneralTab`; `ThemeTab` simplified; back-compat normalization.
- `src/components/dashboard/website-editor/WebsiteEditorShell.tsx` — **new**, extracted from current `ThemeTab` editor-mode JSX (~lines 568–753), now also owns the page picker in its toolbar and the localStorage persistence.
- `src/components/dashboard/website-editor/WebsiteEditorSidebar.tsx` — group `SITE_CONTENT_ITEMS`; remove the in-sidebar page picker (or render read-only when collapsed).

**State that moves into the shell:**
`editorTab`, `selectedPageId`, `showPreview`, `showSidebar`, `publishOpen`, `historyOpen`, `discardOpen`, `EDITOR_COMPONENTS`, `TAB_LABELS`, plus localStorage hydrate/persist.

**Hooks reused for hub status (no new hooks):**
`useActiveTheme`, `useWebsiteBookingSettings`, `useWebsiteRetailSettings`, `useWebsiteSeoLegalSettings`, `useWebsiteSocialLinksSettings`, `useOrgPublicUrl`, `useChangelogSummary`.

**No DB changes. No changes to versioning, publish, or discard logic.**

## Out of scope (deferred)

- Per-section restore (already deferred).
- Empty editor canvas redesign (token-based empty state) — polish wave.
- Breadcrumb unification between `DashboardPageHeader` and editor toolbar — polish wave.
- Keyboard shortcuts (Cmd+S/Z/P, [/]) — power-user wave.
- Editor canvas inline editing — separate initiative.

## Prompting feedback

"Yes" is efficient when context is fresh — and here it was, because the prior turn had a ranked recommendation. That's the move: rank options first, then a single-word approval lands cleanly. To get even more out of follow-ups like this:

- *"Yes — and tighten X"* in one breath lets me adjust scope while approving, instead of waiting for the next round.
- Naming a budget ("ship in one wave", "no DB migrations", "≤6 files touched") gives me a hard guardrail when I'm sequencing.
