

## Fix: Card Titles Truncating in Hub Pages

The root cause is the `truncate` CSS class on the `h3` title element inside `ManagementCard` and `HubCard` components. This forces single-line overflow with ellipsis, clipping titles like "Client Engine Tracker", "Program Team Overview", etc.

### Changes

**1. `src/pages/dashboard/admin/TeamHub.tsx`**
- Line 64: Remove `truncate` from the `h3` class on `ManagementCard` so titles wrap naturally
- Line 63: Remove `min-w-0` from the title wrapper div (no longer needed without truncation)

**2. `src/pages/dashboard/admin/ClientHub.tsx`**
- Same fix on the `HubCard` component: remove `truncate` from `h3` (line ~37)

**3. `src/pages/dashboard/admin/GrowthHub.tsx`**
- Same fix on the `HubCard` component: remove `truncate` from `h3` (line ~37)

All three hub pages share the same card pattern. Removing `truncate` lets titles wrap to a second line when needed while maintaining card height consistency via the existing `h-full` on the Card.

No layout or grid changes required — the 3-column grid already provides enough width for most titles; the few that are longer (e.g., "Birthdays & Anniversaries", "Client Engine Tracker") will simply wrap to two lines, which is visually acceptable and consistent with the description text already wrapping below.

