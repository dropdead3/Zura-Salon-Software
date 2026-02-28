

## Fix Navigation Manager: Seed Failure + Empty State

### Root Cause
The database tables (`website_menus`, `website_menu_items`) exist and have correct RLS policies, but contain zero rows. The auto-seed mutation fires once (guarded by `seedAttempted` ref), and if it fails (silently — no error toast), it never retries. The user is stuck on "Choose menu..." permanently.

### Changes

**1. Fix seed resilience (`NavigationManager.tsx`)**
- Reset `seedAttempted` ref on mutation error so it can retry
- Add `onError` handler to `seedMenus.mutate()` with toast feedback
- Show an explicit "Create Default Menus" button when `menus` is empty and seed isn't pending — gives the user a manual fallback

**2. Add "Sync from Pages" action (`NavigationManager.tsx`)**
- When menus exist but have no items, show a "Sync from Pages" button that reads `pagesConfig.pages` where `show_in_nav: true` and `enabled: true`, and creates corresponding `page_link` menu items automatically
- This bridges the gap between the Pages tab and the Nav tab

**3. Add error display on seed/load failure**
- If `useWebsiteMenus` returns an error, show it with a retry button instead of the spinner
- If the seed mutation errors, show a toast with the error message

### Technical Detail

Current broken flow:
```
menus loads → empty array → seedAttempted=false → mutate() → fails silently → seedAttempted=true → never retries
```

Fixed flow:
```
menus loads → empty array → seedAttempted=false → mutate() → onError: reset ref + toast → user can click "Create Default Menus" button → retries
```

The manual button bypasses the ref guard entirely and calls `seedMenus.mutate()` directly with proper error/success feedback.

**Files to modify:**
- `src/components/dashboard/website-editor/navigation/NavigationManager.tsx` — seed error handling, empty state UI, sync-from-pages button

