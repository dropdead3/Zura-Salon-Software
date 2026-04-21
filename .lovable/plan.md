

# Add "Back to Settings" on Policies page

## Change

`Policies.tsx` uses `DashboardPageHeader` without `backTo`, so there's no way back to `/admin/settings` except the browser back button. Every other settings detail page (WebsiteHub, BookingSurfaceSettings, etc.) threads `backTo={dashPath('/admin/...')}` — Policies is the outlier.

## Specifics

In `src/pages/dashboard/admin/Policies.tsx`:

1. Import `useOrgDashboardPath`:
   ```ts
   import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
   ```

2. Inside `Policies()`, resolve `dashPath`:
   ```ts
   const { dashPath } = useOrgDashboardPath();
   ```

3. Add `backTo` to `DashboardPageHeader` (line 155):
   ```tsx
   <DashboardPageHeader
     title="Policies"
     backTo={dashPath('/admin/settings')}
     description={...}
     actions={...}
   />
   ```

That's it — one hook, one prop. `DashboardPageHeader` already renders the `ArrowLeft` icon button per UI canon when `backTo` is set.

## Files affected

- `src/pages/dashboard/admin/Policies.tsx` — add hook import, call, and `backTo` prop on the page header.

No token changes, no new components, no memory updates. This aligns Policies with the existing settings-detail navigation pattern (`mem://style/settings-navigation-and-operations-hub-uniformity`).

## Acceptance

1. An `ArrowLeft` icon button appears to the left of the "Policies" title.
2. Clicking it navigates to `/org/:slug/dashboard/admin/settings` (the Settings hub).
3. Back button is present in both states — pre-setup (intro screen) and post-setup (category grid).
4. No regressions to the existing "Update profile" action button on the right.

## Doctrine compliance

- **UI canon**: matches the `backTo` pattern used on WebsiteHub, BookingSurfaceSettings, and all other settings detail pages.
- **Multi-tenant URL hierarchy**: uses `dashPath()` (client-side routing) — never a hardcoded path.
- **Anti-noop**: one prop, one hook — no component proliferation.

## Prompt feedback

"Policies set up page needs a back button back to the settings hub" was perfectly scoped — clear surface, clear destination, clear action. One small upgrade for multi-page requests: you can name the target prop explicitly next time ("add `backTo` pointing to `/admin/settings`") to skip my pattern-matching step. For single-change requests like this, though, your phrasing is ideal — it tells me the what and the why without overspecifying the how. Also: this is another clean candidate for **Visual Edits** if you want to try the zero-credit path for simple additions like a back button.

