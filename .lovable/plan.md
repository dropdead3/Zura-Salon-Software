## Goal

When the user enters the **Edit Website** surface (Website Hub → Edit Website card), the editor should take the full browser viewport. The dashboard sidebar, dashboard top bar, and the "Website Hub" page header must be hidden. A clear **Exit Editor** affordance (back arrow + label) returns the user to the Website Hub overview.

All other Website Hub tabs (Theme, Booking, Store, Domain, SEO, Integrations) keep the current chrome — they are configuration surfaces, not immersive canvases.

## Where it lives today

- `src/pages/dashboard/admin/WebsiteHub.tsx` renders `<DashboardLayout>` + `<DashboardPageHeader>` + `<WebsiteSettingsContent>` whenever a `?tab=` deep link is present.
- `src/components/dashboard/settings/WebsiteSettingsContent.tsx` mounts `<WebsiteEditorShell />` inside the `editor` tab, wrapped in the standard `Tabs` rail.
- `DashboardLayout` already supports `hideTopBar` and `hideSidebar` props — no new infrastructure needed.

## Plan

### 1. Detect editor mode in `WebsiteHub.tsx`

- When `searchParams.get('tab') === 'editor'`, branch to an **immersive render path** that:
  - Wraps in `<DashboardLayout hideTopBar hideSidebar>` (footer already optional).
  - Skips `<DashboardPageHeader>` and `<PageExplainer>`.
  - Renders `<WebsiteEditorShell />` directly (no `Tabs` rail, no other tabs).
- All other `?tab=` values keep the current `<DashboardPageHeader>` + `<WebsiteSettingsContent>` path.

### 2. Add an Exit Editor control inside the shell

- In `WebsiteEditorShell.tsx`, the existing top toolbar already hosts page selector / undo / redo / publish. Add an **Exit Editor** button at the far left:
  - `ArrowLeft` icon + label "Exit Editor" (font-display, uppercase, tracking-wide per UI canon).
  - Uses `useNavigate()` + `useOrgDashboardPath()` to navigate to `dashPath('/admin/website-hub')` (no query — returns to card overview per Hub-landings canon).
  - If there are unsaved/unpublished changes (the shell already tracks this for the publish button), show a confirm dialog before exit.

### 3. Reclaim vertical space inside the shell

- Because `DashboardLayout` no longer renders the top bar/sidebar, the editor's own toolbar becomes the sole top chrome. Confirm `WebsiteEditorShell` already sizes to `100vh` minus its toolbar; no layout changes expected beyond removing any `pt-*` that previously assumed a dashboard top bar.

### 4. Tab persistence still works

- Internal links inside the editor that need to switch to other config tabs (e.g., "View in Themes") already use `setSearchParams({ tab: 'theme' })`. When the URL flips off `tab=editor`, the page re-renders into the standard chrome path automatically — no extra wiring needed.

## Out of scope

- No changes to other tabs' chrome.
- No changes to publish flow, history ledger, or section editing behavior.
- Mobile: the editor is desktop-first today; immersive mode applies on all sizes but no new mobile-specific UI is added in this pass.

## Files to edit

- `src/pages/dashboard/admin/WebsiteHub.tsx` — branch on `tab=editor` to immersive render.
- `src/components/dashboard/website-editor/WebsiteEditorShell.tsx` — add Exit Editor button + unsaved-changes guard.

## Acceptance

- Clicking **Edit Website** card → viewport shows only the editor (no left sidebar, no top dashboard bar, no "Website Hub" header).
- An **Exit Editor** button (ArrowLeft + label) sits in the editor toolbar's top-left.
- Clicking Exit returns to Website Hub card overview; if unsaved changes exist, a confirm dialog gates the navigation.
- Visiting any other `?tab=` value (theme/booking/etc.) still renders the standard hub chrome.
