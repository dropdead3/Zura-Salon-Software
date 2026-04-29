# Fix: Editor button loops back to Website Hub

## Root cause

The "Editor" button in `WebsiteSettingsContent.tsx` (line 1142) links to `/admin/website-sections`. In the previous redirect cleanup, that path was rewritten to redirect to `../website-hub` (App.tsx line 378), which lands the user right back on the Website Hub → General tab. The full editor page (`WebsiteSectionsHub.tsx`, with section CRUD, page editing, stylists display, etc.) still exists but is no longer reachable because its only route became a redirect.

## Fix

Two coordinated changes:

### 1. `src/App.tsx` (line 378)

Restore a real route for the Website Editor at a clean, non-legacy path. Replace the redirect with:

```tsx
<Route
  path="admin/website-editor"
  element={
    <ProtectedRoute requiredPermission="manage_settings">
      <WebsiteSectionsHub />
    </ProtectedRoute>
  }
/>
{/* Legacy: keep old slug redirecting to the new editor path */}
<Route
  path="admin/website-sections"
  element={<Navigate to="../website-editor" relative="path" replace />}
/>
```

This:
- Mounts `WebsiteSectionsHub` at the new canonical path `/admin/website-editor`.
- Keeps `/admin/website-sections` as a one-hop redirect for any external bookmarks.
- Avoids the redirect-loop back to `website-hub`.

### 2. `src/components/dashboard/settings/WebsiteSettingsContent.tsx` (line 1142)

Update the Editor button link to point directly at the new path (no redirect hop):

```tsx
<a href={dashPath('/admin/website-editor')}>
```

## Verification

After the change, clicking **Editor** from Website Hub should open `WebsiteSectionsHub` (the section list + inspector with Hero, Testimonials, Gallery, FAQ, Stylists, Locations editors, AddSectionDialog, etc.) instead of redirecting to the General tab.

## Enhancement suggestions (post-fix)

1. **Use `<Link>` not `<a>`**: The Editor button uses a raw `<a href>` which causes a full page reload. Switching to React Router's `<Link>` (or `useNavigate`) preserves SPA state and matches the rest of the dashboard.
2. **Surface deep-link tabs**: The editor opens at the first section. Consider `?section=hero|stylists|gallery` so card CTAs across the dashboard can deep-link straight to the relevant editor panel.
3. **Audit other consumers** of `/admin/website-sections` (`TeamHub.tsx`, `ManagementHub.tsx`, `SidebarLayoutEditor.tsx` from prior context) and update them to `/admin/website-editor` to drop the redirect hop everywhere.