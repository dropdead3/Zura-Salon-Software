

# Fix: Missing Platform Theme Variables on Backroom Settings

## Root Cause

The Backroom Settings page uses `DashboardLayout` (the org dashboard shell), **not** `PlatformLayout`. All `--platform-*` CSS variables are scoped under `.platform-theme.platform-dark` / `.platform-theme.platform-light` selectors in `index.css`. Since those classes are never applied in the dashboard context, every `hsl(var(--platform-*))` reference resolves to empty — causing transparent backgrounds, invisible text, and broken fills.

## Fix

**In `BackroomSettings.tsx`**: Add the `platform-theme platform-dark` classes to a wrapper div around the backroom content (inside `DashboardLayout`). This scopes the platform CSS variables to just this page without affecting the rest of the dashboard.

```tsx
<DashboardLayout>
  <div className="platform-theme platform-dark">
    {/* existing content */}
  </div>
</DashboardLayout>
```

This single change makes all `--platform-bg-card`, `--platform-foreground`, `--platform-border`, `--platform-accent`, etc. variables resolve correctly for every child section (Product Catalog, Inventory, Permissions, etc.).

**Additionally**: The same `platform-theme platform-dark` wrapper needs to be added to the loading and paywall states so they also render correctly.

No changes needed to any section component files — the issue is purely that the theme class scope is missing at the page level.

