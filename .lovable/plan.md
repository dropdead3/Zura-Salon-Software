

## Full URL Hierarchy Restructure

### Target Structure

```text
/                              → Platform landing
/login                         → Unified login
/platform/*                    → Zura platform admin (was /dashboard/platform/*)
/org/:orgSlug/*                → Public org pages (unchanged)
/org/:orgSlug/dashboard/*      → Org dashboard (was /dashboard/*)
/org/:orgSlug/dashboard/admin/* → Org admin pages (was /dashboard/admin/*)
/dock                          → Standalone (unchanged)
/kiosk/:locationId             → Standalone (unchanged)
```

### Scale

- **~100 files** with hardcoded `/dashboard` paths (1900+ references)
- **1 routing file** (App.tsx) with 150+ route definitions
- **6 nav config files** (dashboardNav.ts, platformNav.ts, route-utils.ts, etc.)
- **2 layout components** (DashboardLayout, PlatformLayout)

### Strategy: Centralized Path Builder + Systematic Migration

Rather than find-replacing 1900 strings, we create a **single path utility** that every component uses. This also future-proofs org switching (user navigates between orgs, URL updates automatically).

---

### Phase 1 — Foundation (4 files)

**New: `src/lib/org-path.ts`** — Centralized path builder

```typescript
// Build org-scoped dashboard paths
export function orgDashboardPath(orgSlug: string, path: string = '') {
  return `/org/${orgSlug}/dashboard${path.startsWith('/') ? path : `/${path}`}`;
}

// Build platform paths  
export function platformPath(path: string = '') {
  return `/platform${path.startsWith('/') ? path : `/${path}`}`;
}
```

**New: `src/hooks/useOrgDashboardPath.ts`** — React hook version

Returns a `dashPath(subpath)` function that auto-injects the current org slug from either:
- URL param `:orgSlug` (if already in org-scoped route)
- `OrganizationContext.effectiveOrganization.slug` (fallback)

This is the **single replacement** for every hardcoded `"/dashboard/..."` in the codebase.

**Update: `src/lib/route-utils.ts`** — New zone detection

```typescript
getRouteZone('/platform/...') → 'platform'
getRouteZone('/org/:slug/dashboard/...') → 'org-dashboard'  
getRouteZone('/org/:slug/...') → 'public'
```

**Update: `src/config/platformNav.ts`** — Change all hrefs from `/dashboard/platform/*` to `/platform/*`

---

### Phase 2 — Routing (1 file)

**Update: `src/App.tsx`** — Restructure all route definitions

- Wrap all org dashboard routes inside `<Route path="/org/:orgSlug/dashboard">` with a new `OrgDashboardRoute` wrapper that resolves org from URL slug
- Move platform routes from `/dashboard/platform/*` to `/platform/*`
- Add redirect routes: `/dashboard/*` → `/org/:resolvedSlug/dashboard/*` (for bookmarks, muscle memory)
- Add redirect: `/dashboard/platform/*` → `/platform/*`

**New: `src/components/OrgDashboardRoute.tsx`** — Wrapper that reads `:orgSlug` from URL, validates it, and sets org context (similar to existing `OrgPublicRoute`)

---

### Phase 3 — Systematic Component Migration (~95 files)

Every file with a hardcoded `/dashboard` link or navigate call gets updated:

- `Link to="/dashboard/admin/analytics"` → `Link to={dashPath('/admin/analytics')}`
- `navigate('/dashboard/schedule')` → `navigate(dashPath('/schedule'))`
- `backTo="/dashboard/admin/team-hub"` → `backTo={dashPath('/admin/team-hub')}`

Platform paths:
- `"/dashboard/platform/accounts"` → `"/platform/accounts"` (simple string replace)

The `dashPath` function comes from `useOrgDashboardPath()` hook, called once at the top of each component.

**Nav configs**: `dashboardNav.ts` hrefs become functions that accept orgSlug, or the sidebar component builds paths dynamically.

---

### Phase 4 — Backward Compatibility Redirects

A `<LegacyRedirects />` component in App.tsx that catches:
- `/dashboard/*` → resolves user's org slug from auth context → redirects to `/org/:slug/dashboard/*`
- `/dashboard/platform/*` → `/platform/*`

This ensures existing bookmarks, shared links, and muscle memory still work.

---

### Key Technical Decisions

1. **Org slug source**: URL param is primary (enables org switching via URL). Falls back to auth context for redirects only.
2. **The `dashPath()` hook is the migration vehicle** — every component gets a one-line addition and all its paths become org-aware.
3. **Platform paths are simple string changes** — no hook needed, just `/dashboard/platform` → `/platform`.
4. **No database changes** — orgs already have `slug` field.

### File Count Estimate

| Phase | New | Modified | Total |
|-------|-----|----------|-------|
| 1 — Foundation | 2 | 2 | 4 |
| 2 — Routing | 1 | 1 | 2 |
| 3 — Components | 0 | ~95 | ~95 |
| 4 — Redirects | 0 | 1 | 1 |

This will need to be implemented across multiple messages given the file count. Phase 1+2 first, then Phase 3 in batches of ~15-20 files, then Phase 4.

