

# Move Backroom to Operations Hub — Plan

## What Changes

1. **Remove from sidebar** — Delete the Backroom entry from `manageNavItems` in `src/config/dashboardNav.ts` (line 99).

2. **Add to Operations Hub page** — Add a new `HubGatewayCard` in the "Hubs" `CategorySection` of `src/pages/dashboard/admin/TeamHub.tsx`:
   - Title: **Zura Backroom Hub**
   - Description: "Backroom color & supply management, formulas, and station tracking"
   - Icon: `Beaker` (already used for the sidebar entry)
   - href: `/dashboard/admin/backroom-settings`

3. **Update sidebar preview config** — Remove the `/dashboard/admin/backroom-settings` entry from `SidebarPreview.tsx` link config if present (it's under the Manage section currently).

4. **Update search items** — Check `searchItems` in `dashboardNav.ts` and `CommandMenu.tsx` to ensure the Backroom route remains discoverable via search even though it's no longer in the sidebar.

## Files Modified

| File | Change |
|---|---|
| `src/config/dashboardNav.ts` | Remove backroom line from `manageNavItems` |
| `src/pages/dashboard/admin/TeamHub.tsx` | Add `HubGatewayCard` for Zura Backroom Hub in the Hubs section |
| `src/components/dashboard/settings/SidebarPreview.tsx` | Remove backroom entry if present |

