

## Remove Color/Chemical Badge from Service Tracking Table

### Problem
The "Color/Chemical" badge on each service row is redundant — the context of the tracking configurator already makes it clear these services require color/chemical processing.

### Changes

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`**

Remove the `type === 'chemical'` badge block (lines 812–814). The "Suggested" badge remains since it conveys distinct, non-obvious information.

Also check if the `CheckCircle2` import is still used elsewhere — if not, remove it from imports.

### Result
Cleaner, less cluttered service rows with only actionable/meaningful badges (status, billing method, suggested).

