

## Anchor Search Bar to Left Zone

The search bar is currently centered in the top bar (CENTER ZONE, line 172). Moving it to the LEFT ZONE (line 164), immediately after the navigation arrows.

### Change in `src/components/dashboard/SuperAdminTopBar.tsx`

**LEFT ZONE (line 164-169):** Add `TopBarSearch` right after `NavHistoryArrows` and the conditional `OrganizationSwitcher`:

```tsx
{/* ── LEFT ZONE: Nav + Search ── */}
<div className="flex items-center gap-3 min-w-0 flex-1">
  <NavHistoryArrows />
  {isPlatformUser && location.pathname.startsWith('/dashboard/platform') && (
    <OrganizationSwitcher compact />
  )}
  <div className="min-w-0 w-full max-w-xl">
    <TopBarSearch filterNavItems={filterNavItems} />
  </div>
</div>
```

**CENTER ZONE (lines 172-184):** Remove search, keep only the NextClientIndicator (or remove the zone if empty):

```tsx
{/* ── CENTER ZONE: Status ── */}
<div className="flex-1 flex items-center justify-center min-w-0 px-4">
  {showNextClient && (
    <div className="hidden 2xl:flex items-center min-w-0">
      <NextClientIndicator userId={currentUserId} />
    </div>
  )}
</div>
```

This anchors the search bar to the left, immediately right of the nav arrows, matching the reference screenshot layout.

