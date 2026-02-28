

## Fix: Navigation Manager Not Loading (Org Context Issue)

### Root Cause
The logged-in user is a **platform user** (platform_owner). For platform users, `effectiveOrganization` returns `selectedOrganization`, which is `null` unless explicitly set via the org-switcher. Since `useWebsiteMenus` depends on `effectiveOrganization?.id` for its query, the query is **permanently disabled** — no network request fires, no menus load, no seed triggers.

The WebsiteSectionsHub page already works around this with a slug fallback query, but the Navigation Manager hooks don't have this fallback.

### Changes

**1. Fix `useResolvedOrgId()` in `useWebsiteMenus.ts` (line 100-103)**
- Fall back to `currentOrganization?.id` when `effectiveOrganization` is null
- This mirrors the pattern the hub page uses (`effectiveOrganization || selectedOrganization || currentOrganization`)

```tsx
function useResolvedOrgId() {
  const { effectiveOrganization, currentOrganization } = useOrganizationContext();
  return effectiveOrganization?.id ?? currentOrganization?.id;
}
```

This single change unblocks all menu hooks (`useWebsiteMenus`, `useSeedMenus`, `useCreateMenuItem`, etc.) because they all call `useResolvedOrgId()`.

**2. No other files need changes** — the NavigationManager UI, seed logic, tree editor, and inspector are all correctly wired. The only issue is that the org ID was resolving to `undefined`.

### Files to modify
- `src/hooks/useWebsiteMenus.ts` — 1-line fix to `useResolvedOrgId()`

