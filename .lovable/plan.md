

# Fix: Level Status Not Showing for Non-Stylist-Role Users with Assigned Levels

## Root Cause

The `TeamMemberCard` gates the level badge and status indicator behind a role check on line 755:

```tsx
const isStylistOrAssistant = member.roles.includes('stylist') || member.roles.includes('stylist_assistant');
```

Your user roles are `['super_admin']` — you don't have the `stylist` role. But you DO have `stylist_level: 'studio-artist'` assigned. Since the role check fails, the entire level section (badge + status indicator) is skipped.

## Fix

Change the condition to also include users who have a `stylist_level` assigned, regardless of role. If someone has been assigned a level, they should see it.

### Change in `src/pages/dashboard/TeamDirectory.tsx`

Line 755 — update from:
```tsx
const isStylistOrAssistant = member.roles.includes('stylist') || member.roles.includes('stylist_assistant');
```

To:
```tsx
const isStylistOrAssistant = member.roles.includes('stylist') || member.roles.includes('stylist_assistant') || !!member.stylist_level;
```

This ensures anyone with an assigned stylist level gets the level badge and progression status on their directory card — regardless of their primary role.

| File | Change |
|------|--------|
| `src/pages/dashboard/TeamDirectory.tsx` | Expand `isStylistOrAssistant` check to include users with a `stylist_level` value |

One line. No database changes.

