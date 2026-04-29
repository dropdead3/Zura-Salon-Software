## Goal

Make the Website Hub Preview button open the URL real visitors see (custom domain when verified), centralize the public URL builder so future surfaces don't reinvent string concat, and defer the per-location dropdown until per-location public sites actually exist.

## Scope decisions

**Suggestion #1 (custom domain) — IN.** The `organization_domains` table already exists with a verified `status='active'` lifecycle (DNS propagated + SSL provisioned). Today no frontend code reads it. Preview should resolve to the active domain when present, fall back to `/org/:slug` otherwise.

**Suggestion #2 (per-location dropdown) — DEFER, with rationale.** Routing audit shows there is no public per-location site route. Only `/org/:orgSlug/loc/:locationId/login` exists, which is the branded employee login — not a customer-facing storefront. Adding a "Preview as: Downtown / Uptown" dropdown right now would render a control that points nowhere or 404s for every location pick. Per doctrine ("If a feature does not reduce ambiguity… it does not belong"), this is parked behind a real prerequisite: the public site needs a location-scoped variant first. Logged in the Deferral Register with revisit trigger: "When a `/org/:slug/loc/:locationId` public route ships."

**Suggestion #3 (centralize the URL builder) — IN.** Three hand-rolled `${origin}/org/${slug}` strings in `WebsiteSettingsContent.tsx`. Extract a `useOrgPublicUrl()` hook so custom-domain support lands in one place.

## Implementation

### New hook: `src/hooks/useOrgPublicUrl.ts`

Single source of truth for the org's public-facing URL. Mirrors the shape of `useOrgDashboardPath`.

- Reads `effectiveOrganization` (fallback `currentOrganization`) from `OrganizationContext`.
- Queries `organization_domains` for the active org, filtered to `status = 'active'` and non-null `ssl_provisioned_at`. RLS already restricts to org members.
- Cached via React Query, key includes `organization_id`, `staleTime: 5 * 60_000` (domains change rarely).
- Returns:
  - `publicUrl(subpath?)` — `https://customdomain.com{subpath}` when a verified domain exists, else `${origin}/org/${slug}{subpath}`.
  - `customDomain` — the verified domain string or `null` (lets callers show a "Live at customdomain.com" hint).
  - `isUsingCustomDomain` — boolean for badging.
  - `isLoading` — so callers can disable Preview during initial fetch (avoids flicker from default → custom).

### Migrate the 3 call sites in `WebsiteSettingsContent.tsx`

| Line | Before | After |
|---|---|---|
| 535–540 | `orgPreviewUrl = ${origin}/org/${slug}` | `publicUrl()` from hook |
| 821–823 | Retail store link `…/org/${slug}/shop` | `publicUrl('/shop')` |
| 1132–1138 | Top-level Preview button | `publicUrl()` from hook |

### Surface the custom domain in the UI (small, honest)

When `isUsingCustomDomain === true`, the Preview button gets a subtle subtitle/tooltip: `Live at customdomain.com`. No new chrome — just truth-in-labeling so the operator knows Preview matches what visitors see. If no verified domain, tooltip reads `Preview at /org/{slug}`.

### Deferral Register entry

Append to `mem://architecture/visibility-contracts.md` Deferral Register:

| Item | Reason | Revisit trigger |
|---|---|---|
| Per-location Preview dropdown | No `/org/:slug/loc/:locationId` public route exists; control would 404 | When location-scoped public site route ships |

## Files

- New: `src/hooks/useOrgPublicUrl.ts`
- Edit: `src/components/dashboard/settings/WebsiteSettingsContent.tsx` (3 call sites + Preview button tooltip)
- Edit: `mem://architecture/visibility-contracts.md` (Deferral Register row)

## Out of scope

- Per-location preview dropdown (deferred, see above).
- Migrating other public-URL usages outside `WebsiteSettingsContent.tsx` — none were found in this audit, but the hook is now available for the next surface.
- Custom domain CRUD UI (already lives elsewhere or is admin-managed; this only consumes the verified state).
