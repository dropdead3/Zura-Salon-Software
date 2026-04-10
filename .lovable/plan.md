

# Fix: Show Zura Connect in Sidebar Apps Section

## Problem

The sidebar Apps section filters Connect visibility using `isConnectEntitled` (line 546). If the org's `connect_enabled` flag is off, the link is hidden entirely. But the page itself already renders a `ConnectSubscriptionGate` for non-entitled orgs, so the sidebar link should always be visible.

## Change

**`src/components/dashboard/SidebarNavContent.tsx`** — Remove the feature-flag gate for Connect from the `FEATURE_FLAG_APPS` map. Instead, always show the Connect link in the Apps section (same way Color Bar shows regardless of its settings state). The `ConnectSubscriptionGate` on the page handles access control.

Specifically, remove the `/dashboard/team-chat` entry from `FEATURE_FLAG_APPS` (lines 545-547) so Connect is always rendered when the user has the `manage_settings` permission.

## Files

| File | Change |
|------|--------|
| `src/components/dashboard/SidebarNavContent.tsx` | Remove Connect from `FEATURE_FLAG_APPS` filter so it always shows in Apps |

