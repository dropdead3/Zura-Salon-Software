

## What Happened

The route `/dashboard/admin/website-sections` is pointing to `WebsiteSectionsHub.tsx` -- a simplified stub page that queries a raw `website_sections` database table and renders a basic two-column card layout. This is NOT your full website editor.

Your full three-panel website editor (with the sidebar, live preview, resizable panels, and all the section editors) lives inside `WebsiteSettingsContent.tsx`, which is rendered at `/dashboard/admin/settings?category=website`.

The Management Hub card labeled "Website Editor" links to the wrong route.

## Plan

### 1. Redirect the route to the real editor
Change the route definition in `src/App.tsx` so `/dashboard/admin/website-sections` redirects to `/dashboard/admin/settings?category=website` (where the full editor lives), instead of rendering the stub `WebsiteSectionsHub`.

This also handles all the existing deep-links (e.g., `?tab=stylists`, `?tab=testimonials`) by redirecting them to the settings page with the website category.

### 2. Update the Management Hub link
Change the `href` in `src/pages/dashboard/admin/ManagementHub.tsx` from `/dashboard/admin/website-sections` to `/dashboard/admin/settings?category=website`.

### 3. Update any other internal links
The `MyProfile.tsx` link to `website-sections?tab=stylists` and any other references will be updated to point to the settings route.

### 4. Clean up the stub (optional)
`WebsiteSectionsHub.tsx` can be reduced to a simple redirect component or removed entirely since the route will redirect.

