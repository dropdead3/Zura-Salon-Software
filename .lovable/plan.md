

# Fix: Zura Capital 404 — Doubled Org Prefix in Sidebar Link

## Root Cause

The sidebar nav item for Zura Capital on line 152 of `SidebarNavContent.tsx` sets `href` to `dashPath('/admin/capital')` — which produces a fully resolved path like `/org/drop-dead-salons/dashboard/admin/capital`.

Later, when rendering nav items (line 668), the code calls `dashPath(item.href.replace(/^\/dashboard/, ''))` — running `dashPath` a **second time** on an already-resolved path. Since the href doesn't start with `/dashboard`, the replace is a no-op, and the org prefix gets doubled:

```text
/org/drop-dead-salons/dashboard/org/drop-dead-salons/dashboard/admin/capital
```

All other nav items use raw `/dashboard/...` paths (which get the `/dashboard` prefix stripped before `dashPath` resolves them). The Capital item is the only one that pre-resolves with `dashPath`.

## Fix

Change line 152 from:
```ts
{ href: dashPath('/admin/capital'), ... }
```
to:
```ts
{ href: '/dashboard/admin/capital', ... }
```

This matches the convention used by every other nav item in the sidebar, allowing the rendering logic on line 668 to correctly strip `/dashboard` and then apply `dashPath` once.

## Scope

| File | Change |
|---|---|
| `src/components/dashboard/SidebarNavContent.tsx` | Line 152: use raw `/dashboard/admin/capital` path instead of pre-resolved `dashPath()` |

One-line fix. No other files affected.

