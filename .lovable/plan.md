

## Remove Website Editor from Growth Hub

Good call -- now that Website Hub lives in the Operations Hub gateway, the duplicate entry in Growth Hub creates redundancy.

### Change

**File: `src/pages/dashboard/admin/GrowthHub.tsx`**

1. Remove the `HubCard` for "Website Editor" (the one linking to `/dashboard/admin/settings?category=website`)
2. Remove the `Globe` import from `lucide-react` (no longer needed)

The "Marketing & Visibility" section will retain Campaigns and SEO Workshop.

