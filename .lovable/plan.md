

# Move Badges to Top-Right Corner of Cards

## Problem

The Active/Inactive/Coming Soon badges are currently inline next to the app name in the header row. The user wants them positioned at the absolute top-right corner of each card.

## Changes

### `src/pages/dashboard/AppsMarketplace.tsx`

**SubscribedAppCard (lines 182-245)**
- Add `relative` to the Card or CardContent wrapper
- Remove the `Badge` from inside the header's `flex items-center gap-2.5` row (lines 198-209)
- Place the Badge as an absolutely positioned element: `absolute top-4 right-4`

**ExploreAppCard (lines 248-305)**
- Same pattern: add `relative` to the wrapper
- Move the "Coming Soon" Badge (lines 266-268) out of the header row and position it `absolute top-4 right-4`

No data model or structural changes — purely repositioning three badge instances within their card containers.

| File | Change |
|------|--------|
| `src/pages/dashboard/AppsMarketplace.tsx` | Move badges from inline-with-title to `absolute top-4 right-4` in both card components |

