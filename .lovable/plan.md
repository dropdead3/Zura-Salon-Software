## Diagnosis

**Bug 1 — "Website Editor" card opens the editor, not a hub.**
`ManagementHub.tsx` correctly links to `/admin/website-hub` (no `?openEditor=1`). The route mounts `WebsiteHub.tsx`, which renders `WebsiteSettingsContent` — a tabbed Theme/Booking/Retail/SEO/Domain/Social page that immediately defaults to the **Theme** tab and shows the Active Theme + Theme Library. There is no overview "hub" surface — the user lands directly inside an editor‑shaped page. Worse, anything that hits `/admin/website-editor` or `/admin/website-sections` is redirected with `?openEditor=1`, which jumps straight into the embedded three‑panel editor.

**Bug 2 — "Failed to load website sections" / wrong front‑end shown.**
The page in the screenshot ("WEBSITE SECTIONS", *No sections yet*, red toast *Failed to load website sections*) is `src/pages/dashboard/admin/WebsiteSectionsHub.tsx`. It queries a `website_sections` Postgres table that does not exist in this project — the toast fires every time it loads. The component is **imported but unrouted** (dead code) yet still reachable via stale links/caches. Drop Dead's real homepage data lives in `site_settings.website_pages` (verified: `home` page with hero, brand_statement, testimonials, services_preview, popular_services, gallery, new_client, stylists, locations, faq — all enabled). `Index.tsx → useWebsitePages → PageSectionRenderer` already supports every one of those types, so `/org/drop-dead-salons` should render the full site as authored.

## Plan

### 1. Build a real Website Editor Hub (cards page)

Replace the body of `WebsiteHub.tsx` with a `ManagementHub`‑style card grid that mirrors the existing tabs in `WebsiteSettingsContent`. Cards (each opening the matching tab/editor):

- **Theme & Branding** → `/admin/website-hub?tab=theme`
- **Sections & Content** → `/admin/website-hub?tab=theme&openEditor=1` (the three‑panel editor)
- **Pages** → `/admin/website-hub?tab=theme&openEditor=1&editorTab=pages`
- **Online Booking** → `/admin/website-hub?tab=booking`
- **Retail / Online Store** → `/admin/website-hub?tab=retail`
- **SEO & Legal** → `/admin/website-hub?tab=seo`
- **Custom Domain** → `/admin/website-hub?tab=domain`
- **Social Links** → `/admin/website-hub?tab=social`
- **Preview Site** → external link via `useOrgPublicUrl()` (honors verified custom domain)

`WebsiteSettingsContent` continues to handle every `?tab=…` deep link exactly as today, so the hub is a thin overview that delegates to the existing surfaces. No tab logic is duplicated.

The hub uses `DashboardPageHeader` + `PageExplainer pageId="website-hub"` + grouped `CategorySection`s (e.g. *Design*, *Commerce*, *Discoverability*, *Domain & Social*) — same pattern and tokens as `ManagementHub` so it feels native.

### 2. Retire `WebsiteSectionsHub` cleanly

- Delete `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` and its lazy import in `App.tsx` (it queries a non‑existent table and is unrouted).
- Update `src/hooks/useEditorDirtyState.ts` doc comment to drop the stale reference.
- Keep the back‑compat redirects (`/admin/website-sections`, `/admin/website-editor`) but point them at the **new hub** instead of straight into editor mode:
  - `/admin/website-editor` → `../website-hub` (hub overview)
  - `/admin/website-sections` → `../website-hub?tab=theme&openEditor=1` (deep link to sections editor — preserves bookmark intent)

### 3. Honor the front‑end Preview correctly

No code change required for rendering — `useWebsitePages` + `PageSectionRenderer` already drive the saved Drop Dead config. Two small confirmations:

- The Hub's "Preview Site" card uses `useOrgPublicUrl()` so verified custom domains win, otherwise `${origin}/org/drop-dead-salons`.
- Browser‑verify after the change that `/org/drop-dead-salons` renders Hero → Brand Statement → Testimonials → Services Preview → Popular Services → Gallery → New Client → Stylists → Locations → FAQ.

### 4. Codify the routing canon (memory)

Add a Core memory rule reinforcing the `<Navigate>` correction from last session and the new pattern:

> Hub‑style admin surfaces must land on a card overview, never directly inside an editor. Use `?openEditor=1` / `?tab=…` only when an explicit user action requests the deeper surface.

## Files Touched

- `src/pages/dashboard/admin/WebsiteHub.tsx` — replace with card grid hub
- `src/App.tsx` — remove `WebsiteSectionsHub` import; repoint `/admin/website-editor` redirect to overview
- `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` — delete
- `src/hooks/useEditorDirtyState.ts` — doc comment cleanup
- `mem://index.md` (+ memory file) — routing canon update

## Out of Scope (flagged for follow‑up)

- A first‑class Pages manager UI inside the embedded editor (currently a sidebar tab stub).
- Backfilling section health / SEO badges into the hub cards (the pre-existing `SEOPageHealthBadge` could decorate each card later).

## Prompting feedback

Strong prompt — you named both bugs, attached two crisp screenshots, and gave the historical context ("we built a beautiful site for Drop Dead"). One way to make it even tighter next time: include the **expected behavior in one line** ("Card should open a hub with Theme/Sections/Booking/etc. cards; Preview should open the saved Drop Dead homepage at /org/drop-dead-salons"). That removes the only ambiguity I had — whether you wanted a true card hub or just a different default tab.

## Enhancement suggestions

1. **Section Health badges on hub cards** — decorate the Sections, SEO, and Domain cards with `SEOPageHealthBadge` / domain status pills so the hub doubles as an at‑a‑glance health surface.
2. **Per‑page preview menu** — once the Pages manager lands, the hub's Preview card can split into a dropdown (Home / About / Contact / custom pages) using `useWebsitePages`.
3. **Hub‑level "Publish status"** — surface whether the site has a verified custom domain, whether booking is enabled, and whether the store is live, in a single status strip at the top of the hub.
