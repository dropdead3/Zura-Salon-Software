

## Scope `site_settings` to Organization (Tenant Isolation Fix)

### Problem
The `site_settings` table is a flat key-value store with no `organization_id`. All orgs share the same rows. This is a critical cross-pollination risk for website config, section configs, announcement bar, review thresholds, and performance thresholds.

### Approach
Add a composite key of `(organization_id, id)` so each org gets its own settings. Migrate existing data to the first org. Update all hooks to filter by org. Update RLS to enforce tenant isolation.

### Changes

**1. Database migration**
- Add `organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE` to `site_settings` (nullable initially)
- Backfill existing rows with the current org's ID
- Make `organization_id` NOT NULL
- Drop existing primary key on `id`, create composite primary key `(organization_id, id)`
- Drop existing RLS policies, create org-scoped ones:
  - SELECT: `is_org_member(auth.uid(), organization_id)` (plus keep public read for public site routes)
  - INSERT/UPDATE: `is_org_admin(auth.uid(), organization_id)`
- Add index on `organization_id`

**2. Update `useSiteSettings.ts`**
- Accept `orgId` param (from `useOrganizationContext`)
- Add `.eq('organization_id', orgId)` to all queries
- Include `orgId` in query keys
- Add `enabled: !!orgId` guard

**3. Update `useSectionConfig.ts`**
- Same pattern: add org scoping to read/write queries

**4. Update `useWebsitePages.ts`**
- Add org scoping to `website_pages` and `website_sections` lookups
- Include `organization_id` in upserts

**5. Update `useAnnouncementBar.ts`**
- Add org scoping

**6. Update `useReviewThreshold.ts` and `usePerformanceThreshold.ts`**
- Add org scoping

**7. Update `usePandaDocFieldMapping.ts`**
- Add org scoping

**8. Update `usePlatformBranding.ts`**
- This one is intentionally platform-scoped (not per-org). Keep it reading rows where `organization_id IS NULL` or add a special platform scope marker.

**9. Update all components that call these hooks**
- Pass `orgId` where required (most already have access via `useOrganizationContext`)

**10. Public site route handling**
- The public website route (`/org/:slug`) needs anonymous read access scoped to active orgs
- Add RLS policy: `SELECT` allowed when `organization_id IN (SELECT id FROM organizations WHERE status = 'active')` for anon users

### Files (estimated)
- SQL migration (new)
- `src/hooks/useSiteSettings.ts`
- `src/hooks/useSectionConfig.ts`
- `src/hooks/useWebsitePages.ts`
- `src/hooks/useAnnouncementBar.ts`
- `src/hooks/useReviewThreshold.ts`
- `src/hooks/usePerformanceThreshold.ts`
- `src/hooks/usePandaDocFieldMapping.ts`
- `src/hooks/usePlatformBranding.ts`
- Multiple editor components (to pass orgId if not already available)

### Risk Mitigation
- Backfill migration runs first, ensuring no data loss
- Platform-level settings (branding) remain unscoped or use a sentinel `organization_id`
- Public site access preserved via dedicated anon RLS policy

