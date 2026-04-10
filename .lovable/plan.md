

# Fix: Only Show Entitled Apps in "Your Apps"

## Problem

The `SUBSCRIBED_APPS` array is hardcoded with all three apps (Color Bar, Connect, Payroll). The page always renders all of them under "Your Apps" regardless of entitlement status. Zura Payroll appears there with an "Inactive" badge even though the organization has no subscription — this is misleading and breaks the marketplace's commercial intent.

## Proposed behavior

- **Your Apps**: Only apps where `getActiveStatus(key) === true`
- **Inactive apps**: Move to "Explore Apps" section with a "Contact Sales" or "Get Started" CTA, alongside the coming-soon apps
- If no apps are active, show an empty state under "Your Apps" encouraging the user to explore

## Changes

### `src/pages/dashboard/AppsMarketplace.tsx`

1. **Filter `SUBSCRIBED_APPS` by entitlement** — split into active and inactive at render time:
   ```typescript
   const activeApps = SUBSCRIBED_APPS.filter(app => getActiveStatus(app.key));
   const inactiveApps = SUBSCRIBED_APPS.filter(app => !getActiveStatus(app.key));
   ```

2. **"Your Apps" section** — render only `activeApps`. If empty, show a minimal empty state ("No apps activated yet. Explore below to get started.")

3. **"Explore Apps" section** — prepend `inactiveApps` before the existing `EXPLORE_APPS`, using a variant of `ExploreAppCard` that shows "Contact Sales" instead of "Notify Me" (since these are available now, not coming soon). The badge should say "Available" instead of "Coming Soon."

4. **New card variant or prop** — add an `available` state to `ExploreAppCard` (or create an `AvailableAppCard`) that distinguishes between "available but not subscribed" and "coming soon":
   - Available: Badge says "Available" (blue outline), CTA is "Contact Sales"
   - Coming Soon: Badge says "Coming Soon" with lock icon, CTA is "Notify Me"

## Result

- Clean commercial hierarchy: active apps up top, available-for-purchase in explore, coming-soon at bottom
- Payroll only appears in "Your Apps" once the org has `payroll_enabled` toggled on
- No misleading "Inactive" badges sitting alongside "Active" apps

