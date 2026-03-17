

## Gate Platform Styling from Organization Dashboard Styling

### Root Cause

Three systems all write CSS variables and class toggles to the **same global target** (`document.documentElement`), causing cross-pollination:

1. **`ThemeInitializer`** — loads org user's custom theme colors/typography from `user_preferences` and sets `--*` vars on `:root`. It skips non-`/dashboard` routes, but **`/dashboard/platform/*` IS under `/dashboard`**, so org overrides bleed into platform pages.

2. **`DashboardThemeContext`** — toggles `.dark` class on `<html>` based on the org dashboard theme preference. When the org dashboard is in dark mode and the user navigates to platform, or vice versa, styles clash.

3. **`usePlatformBrandingEffect`** — sets `--platform-*` vars on `document.documentElement`, which leak into org dashboard pages.

### Fix (3 targeted changes)

#### 1. `ThemeInitializer.tsx` — exclude platform routes
Change the early-return check from just `!startsWith('/dashboard')` to also exclude `/dashboard/platform`:

```ts
if (!window.location.pathname.startsWith('/dashboard') 
    || window.location.pathname.startsWith('/dashboard/platform')) {
  return;
}
```

Also: on cleanup/SIGNED_OUT, only strip non-`platform-` prefixed custom vars so platform variables aren't nuked.

#### 2. `DashboardThemeContext.tsx` — don't toggle `.dark` on platform routes
Wrap the `document.documentElement.classList` toggle in a route check so it only fires when the user is on an org dashboard route (not `/dashboard/platform/*`). Add a `useLocation()` or `window.location` check:

```ts
useEffect(() => {
  // Don't touch global dark class on platform routes — platform manages its own theme
  if (window.location.pathname.startsWith('/dashboard/platform')) return;
  
  const root = document.documentElement;
  if (resolvedTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}, [resolvedTheme]);
```

#### 3. `usePlatformBranding.ts` — scope vars to platform container
Change `usePlatformBrandingEffect` to set CSS variables on the `.platform-theme` container element instead of `document.documentElement`. This ensures platform color overrides never reach org dashboard pages:

```ts
useEffect(() => {
  const platformRoot = document.querySelector('.platform-theme') as HTMLElement | null;
  const target = platformRoot || document.documentElement;
  
  if (branding?.theme_colors) {
    Object.entries(branding.theme_colors).forEach(([key, value]) => {
      if (value) target.style.setProperty(`--${key}`, value);
    });
  }
  
  return () => {
    if (branding?.theme_colors) {
      Object.keys(branding.theme_colors).forEach((key) => {
        target.style.removeProperty(`--${key}`);
      });
    }
  };
}, [branding?.theme_colors]);
```

Same scoping treatment for `PlatformAppearanceTab.tsx` and `PlatformThemeEditor.tsx`.

### Result
- Org dashboard theme vars/classes stay within org routes
- Platform theme vars/classes stay within platform routes  
- Navigation between the two no longer causes style bleed

