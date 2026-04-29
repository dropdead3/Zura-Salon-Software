# Page selector in the Website Editor

## What you'll be able to do

Open the Website Editor and use a single dropdown at the top of the left sidebar to jump between **Home, About, Contact** (and any custom pages). The Editor button itself will also start opening the *real* editor instead of the empty stub it points at today.

## Why two changes (not one)

Today there are two "website editors" living in the codebase:

1. **The real one** — embedded in Website Hub → Theme → Customize. It uses `WebsiteEditorSidebar` (section list, navigation, templates).
2. **The stub** — `WebsiteSectionsHub.tsx`, which is what the **Editor** button currently opens (we just re-pointed it last turn). It queries a `website_sections` table that **does not exist in the database**, so the page renders empty regardless. It's effectively dead code.

So a useful page selector means doing two things together: wire the selector into the real editor, and route the Editor button to it.

## Changes

### 1. `WebsiteEditorSidebar.tsx` — promote the existing page Select

The sidebar already accepts `selectedPageId` / `onPageChange` props and renders a page `<Select>` at line ~468 — but it's gated behind a state the parent never wires, so it never appears. Lift it to a prominent slot at the top of the sidebar (above "Site Content"):

- Pill-shaped `<Select>` styled per Input Shape Canon (rounded-full, font-sans Title Case — never uppercase per Typography Canon).
- Source of truth: `useWebsitePages()` (already imported on line 159). Default pages: Home, About Us, Contact + any custom pages.
- Also expose all pages from `pagesConfig.pages` (not just the 3 defaults) so custom pages appear too.
- Selecting a page swaps the section list below to that page's sections (logic already exists at lines 336-346 — `isHomePage` branch shows `localSections` from `useWebsiteSections`, non-home shows `selectedPage.sections`).
- A small "+ New page" item at the bottom of the dropdown calls `onAddPage` (already wired, opens `PagesManager` add flow).

### 2. `WebsiteSettingsContent.tsx` — pass page state into the sidebar

The embedded editor at line 581 renders `<WebsiteEditorSidebar activeTab onTabChange />` but never passes page props. Add:

```tsx
const [selectedPageId, setSelectedPageId] = useState('home');
// ...
<WebsiteEditorSidebar
  activeTab={editorTab}
  onTabChange={setEditorTab}
  selectedPageId={selectedPageId}
  onPageChange={setSelectedPageId}
/>
```

Also surface the current page name in the editor's top status bar (line 600 area) so the user always knows which page they're editing: `Editing: {pageName} • {sectionLabel}`.

### 3. Re-point the Editor button to the real editor

The `Editor` button in `WebsiteSettingsContent.tsx` (line 1142) currently opens `/admin/website-editor` → `WebsiteSectionsHub` (the stub). Switch it to a no-route action that flips the same component into editor mode, since the real editor lives right here:

```tsx
<Button variant="outline" size={tokens.button.card} onClick={() => setMode('editor')}>
  <ExternalLink className="w-4 h-4 mr-1.5" />
  Editor
</Button>
```

This drops a redirect hop, fixes the dead-stub problem, and lets the page selector work the moment the user clicks Editor.

### 4. Route hygiene (App.tsx)

Keep `/admin/website-editor` mounted but point it at the real Website Hub with a `?tab=theme&mode=editor` query so external bookmarks still land on a working editor. Then have `WebsiteSettingsContent` honor those query params on mount (read once, set tab + mode).

```text
/admin/website-editor   →  WebsiteHub  (auto-opens Theme tab in editor mode)
/admin/website-sections →  redirect to /admin/website-editor (already done)
```

The dead `WebsiteSectionsHub.tsx` page can stay on disk for now — just no longer reachable.

## Layout (sidebar, top to bottom)

```text
┌──────────────────────────────┐
│ Page                          │
│ [ Home              ▾ ]       │  ← new selector, pill, full width
├──────────────────────────────┤
│ HOME SECTIONS                 │
│   Hero                        │
│   Brand Statement             │
│   …                           │
├──────────────────────────────┤
│ SITE CONTENT                  │
│   Services / Stylists / etc.  │
└──────────────────────────────┘
```

When a non-home page is selected, the middle group header switches to `{Page} SECTIONS` and shows that page's sections (existing behavior at lines 620-664).

## Out of scope (call-outs, not in this change)

- Per-page templates / cloning (already exists via `PagesManager` — reachable via the dropdown's "Manage pages" link, no UI change).
- Wiring the Services and Gallery dropdown items to direct-link into their existing managers — currently the user must click the section in the list, which is one extra hop. Worth a follow-up.
- Cleaning up the dead `WebsiteSectionsHub.tsx` page and its unused `website_sections` query (separate hygiene task).

## Doctrine notes

- **Input Shape Canon** — page `<Select>` is rendered with `rounded-full`.
- **Typography Canon** — page titles use `font-sans` Title Case, group header above remains `font-display` uppercase.
- **Routing** — uses `dashPath()` for the (now-secondary) `/admin/website-editor` URL; mode/tab state is local React state, not URL state, except for the optional `?tab=&mode=` deep-link.
- **Tenant isolation** — `useWebsitePages` already scopes by `useSettingsOrgId`; no new queries are introduced.

## Enhancement suggestions (post-fix)

1. **Deep-link via URL** — promote the editor's `mode`/`page`/`section` to URL query params (`?mode=editor&page=about&section=hero`) so the page selector survives reloads and the dashboard can link to a specific editor state.
2. **Keyboard nav** — `⌘K` page switcher inside the editor (your `WebsiteEditorSearch` component already exists; extend it to include pages).
3. **Retire the stub** — delete `WebsiteSectionsHub.tsx` and its `website_sections` table reference once the new flow is verified, to remove the trap entirely.
4. **Prompt-craft note** — saying "page/layout selector" gave me two interpretations (page picker vs. layout/template picker). For sharper next prompts try: *"Add a page picker in the website editor's left sidebar so I can switch between Home / About / Contact / custom pages."* The added phrase "left sidebar" anchors the location, and listing the page names communicates scope.