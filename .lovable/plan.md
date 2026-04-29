## Problem

Clicking the **Website Editor** card in Operations Hub navigates to a broken URL:

```text
/org/drop-dead-salons/dashboard/admin/website-sections/admin/website-hub
```

instead of:

```text
/org/drop-dead-salons/dashboard/admin/website-hub
```

Confirmed by direct browser test — the path `admin/website-sections` is matched, then its `<Navigate>` redirect appends a second `admin/website-hub` segment.

## Root cause

In `src/App.tsx`, the legacy redirect routes use **bare relative paths** as their `to` target:

```tsx
<Route path="admin/website-sections" element={<Navigate to="admin/website-hub" replace />} />
```

In React Router v6, a `to` value without a leading `/` or `..` resolves **relative to the matched route's URL**, not its parent. So from `/org/:slug/dashboard/admin/website-sections`, `to="admin/website-hub"` becomes `…/admin/website-sections/admin/website-hub`.

The same flaw affects 7 sibling redirects on lines 372–380, plus 380's `admin/team-members?view=invitations`. The handbook redirects on lines 367/369 already use the correct `../handbooks?...` pattern, which is the intended fix.

## Fix

Update `src/App.tsx` to prefix each broken redirect with `../`, so they resolve relative to the parent `/org/:orgSlug/dashboard` route segment instead of the matched leaf:

| Line | Before | After |
|------|--------|-------|
| 372 | `to="admin/website-hub"` | `to="../website-hub"` |
| 373 | `to="admin/website-hub"` | `to="../website-hub"` |
| 374 | `to="admin/website-hub"` | `to="../website-hub"` |
| 375 | `to="admin/website-hub"` | `to="../website-hub"` |
| 376 | `to="admin/website-hub"` | `to="../website-hub"` |
| 377 | `to="admin/website-hub"` | `to="../website-hub"` |
| 378 | `to="admin/website-hub"` | `to="../website-hub"` |
| 379 | `to="admin/access-hub?tab=role-config"` | `to="../access-hub?tab=role-config"` |
| 380 | `to="admin/team-members?view=invitations"` | `to="../team-members?view=invitations"` |

This matches the working pattern already used on lines 367 and 369 (`../handbooks?tab=wizard`) and preserves the dynamic `:orgSlug` correctly across all tenants.

## Verification

After the fix, navigate to the preview's `/org/drop-dead-salons/dashboard/admin/team-hub`, click **Website Editor** in **Marketing & Visibility**, and confirm the URL becomes `/org/drop-dead-salons/dashboard/admin/website-hub` and the Website Hub renders. Spot-check one other affected legacy path (e.g. `/admin/services` → `/admin/website-hub`).

## Files

- `src/App.tsx` — update 9 `<Navigate to=...>` props (lines 372–380).

## Out of scope

The card link itself (`/admin/website-sections` from `TeamHub.tsx`) is intentionally going through the legacy redirect, which is fine once the redirect is fixed. A future P2 cleanup could point hub cards directly at `/admin/website-hub` to skip the redirect hop, but that's a separate housekeeping pass across `TeamHub.tsx`, `ManagementHub.tsx`, and `SidebarLayoutEditor.tsx`.
