

## Fix Dashboard UI Regressions from Sheet/Drawer Migration

### Problem
The Sheet-to-PremiumFloatingPanel migration inadvertently stripped critical UI elements from `DashboardLayout.tsx`. The header JSX was reduced to just a mobile hamburger button, removing:
- **SuperAdminTopBar** (the entire top menu bar with search, notifications, avatar, nav arrows)
- **HelpFAB** (the floating action button)
- **DashboardLockScreen** and **ClockInPromptDialog**
- **IncidentBanner**, **CustomLandingPageBanner**, **PlatformContextBanner**
- **ZuraStickyGuidance**
- **KeyboardShortcutsDialog**

All of these components are imported but never rendered in the current JSX.

### Root Cause
When the mobile sidebar was migrated from Sheet to PremiumFloatingPanel, the surrounding layout JSX was likely truncated — the `main` element lost everything except the mobile menu button and child content.

### Fix (1 file)

**`src/components/dashboard/DashboardLayout.tsx`** — Restore the missing JSX elements inside `DashboardLayoutInner`:

1. **Replace the stripped header** (lines 480-492) with the full `SuperAdminTopBar` component that was there before. The `SuperAdminTopBar` handles all top-bar rendering (search, nav arrows, notifications, avatar dropdown, role badges, view-as indicators).

2. **Add back the following components** after the `</main>` closing tag (before the closing `</div>` of the layout):
   - `<HelpFAB />`
   - `<DashboardLockScreen />`
   - `<ClockInPromptDialog />`
   - `<KeyboardShortcutsDialog />`
   - `<ZuraStickyGuidance />` (conditional on `hasZuraGuidance`)

3. **Add back banners** before `{children}` inside main:
   - `<PlatformContextBanner />`
   - `<IncidentBanner />`
   - `<CustomLandingPageBanner />`

4. **Pass required props to SuperAdminTopBar** — it needs `roleBadges`, `viewAsRole`, `isViewingAs`, `isViewingAsUser`, `viewAsUser`, `clearViewAs`, `setViewAsRole`, `setViewAsUser`, `teamMembers`, `locations`, `userSearch`, `setUserSearch`, `hideNumbers`, `toggleHideNumbers`, `user`, `signOut`, `employeeProfile`, `profileCompletion`, `headerScrolled`, `sidebarCollapsed`, and sidebar toggle handler. All of these variables already exist in `DashboardLayoutInner` scope from the existing imports and hooks.

### What This Does Not Change
- PremiumFloatingPanel migration (stays as-is)
- Sidebar rendering (stays as-is)
- No new components or files

