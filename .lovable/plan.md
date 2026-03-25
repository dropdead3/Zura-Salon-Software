

## Add "Apps" Section to Sidebar Navigation

### Overview
Add a new "APPS" section between "Manage" and "System" in the sidebar, containing "Zura Backroom" as the first app. The section only appears when the organization has at least one activated app. Drop-Dead-Salons (founder org) gets all apps by default.

### Changes

#### 1. Database — Create `organization_apps` table
```sql
CREATE TABLE public.organization_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  app_key text NOT NULL,           -- e.g. 'backroom'
  activated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, app_key)
);
ALTER TABLE public.organization_apps ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can read their org's apps
CREATE POLICY "Users can view their org apps"
  ON public.organization_apps FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.employee_profiles WHERE user_id = auth.uid()
  ));

-- Seed Drop-Dead-Salons with all apps
INSERT INTO public.organization_apps (organization_id, app_key)
SELECT id, 'backroom' FROM public.organizations WHERE slug = 'drop-dead-salons'
ON CONFLICT DO NOTHING;
```

#### 2. Hook — `useOrganizationApps`
New hook `src/hooks/useOrganizationApps.ts`:
- Queries `organization_apps` for the effective organization
- Returns `{ apps: string[], hasApp: (key) => boolean, isLoading }`

#### 3. Nav registry — `dashboardNav.ts`
Add a new `appsNavItems` array:
```ts
export const appsNavItems: DashboardNavItem[] = [
  { href: '/dashboard/admin/backroom-settings', label: 'Zura Backroom', labelKey: 'zura_backroom', icon: Package, permission: 'manage_settings' },
];
```

#### 4. Sidebar layout config — `useSidebarLayout.ts`
- Add `'apps'` to `DEFAULT_SECTION_ORDER` (between `manage` and `system`)
- Add `SECTION_LABELS.apps = 'Apps'`
- Add `SECTION_ICONS.apps = Package`
- Add `DEFAULT_LINK_ORDER.apps`

#### 5. `DashboardLayout.tsx`
- Import `appsNavItems` and pass as a new prop to `SidebarNavContent`

#### 6. `SidebarNavContent.tsx`
- Accept `appsNavItems` prop and add to `sectionItemsMap`
- Add conditional logic: the `apps` section only renders when `useOrganizationApps().apps.length > 0`
- Filter `appsNavItems` to only show apps the org has activated (e.g. only show Backroom if `hasApp('backroom')`)

### Files Modified
- Database migration (new `organization_apps` table + seed)
- `src/hooks/useOrganizationApps.ts` (new)
- `src/config/dashboardNav.ts` — add `appsNavItems`
- `src/hooks/useSidebarLayout.ts` — add `apps` section config
- `src/components/dashboard/DashboardLayout.tsx` — pass apps nav items
- `src/components/dashboard/SidebarNavContent.tsx` — render apps section conditionally

