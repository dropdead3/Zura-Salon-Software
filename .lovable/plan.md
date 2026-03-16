

# Fix: Platform Select Dropdowns Missing Backgrounds in Dialogs

## Root Cause

Radix UI `Select`, `Popover`, and `Dialog` components use **portals** that render at `document.body`, outside the `.platform-theme.platform-dark` / `.platform-theme.platform-light` scoped div in `PlatformLayout`. Since the `--platform-*` CSS variables are only defined within that scoped element, portaled dropdown content gets **no values** for those variables — resulting in transparent/invisible backgrounds.

## Fix

**Add a `useEffect` in `PlatformLayout`** that syncs the platform theme class to `document.body` so portaled elements inherit the CSS variables.

### Changes

**`PlatformLayout.tsx`** — Add effect to mirror theme classes on `<body>`:
```typescript
useEffect(() => {
  document.body.classList.add('platform-theme');
  document.body.classList.toggle('platform-dark', resolvedTheme === 'dark');
  document.body.classList.toggle('platform-light', resolvedTheme !== 'dark');
  return () => {
    document.body.classList.remove('platform-theme', 'platform-dark', 'platform-light');
  };
}, [resolvedTheme]);
```

This is a single-file, 6-line fix that resolves the issue for all portaled platform components (selects, dialogs, popovers) at once — no need to touch individual components.

