

# Settings Page Slow Load — Diagnosis and Fix

## Root Cause

The Admin Settings page (`src/pages/dashboard/admin/Settings.tsx`) is a 1556-line monolithic file that **eagerly imports ~35 heavy components** at the top level. Every sub-page (Email Templates, Stylist Levels, Integrations, Onboarding, Loyalty, etc.) is bundled into a single chunk — even though only ONE category is visible at a time.

Additionally, `fetchUsers()` fires on mount unconditionally, and several hooks (`useBusinessCapacity`, `useSettingsLayout`, `useColorTheme`, `useRoleUtils`, `useBillingAccess`) all execute queries immediately regardless of which settings category the user is viewing.

## Fix — Two Changes

### 1. Lazy-load category content components

Convert the ~20 heavy content imports to `React.lazy()` so they only load when their category is selected:

```ts
// Before (all loaded immediately):
import { EmailTemplatesManager } from '...';
import { OnboardingConfigurator } from '...';
import { StylistLevelsContent } from '...';
// ... 15+ more

// After (loaded on demand):
const EmailTemplatesManager = lazy(() => import('...'));
const OnboardingConfigurator = lazy(() => import('...'));
const StylistLevelsContent = lazy(() => import('...'));
```

Wrap the category detail view in `<Suspense fallback={<DashboardLoader />}>` so it shows a loader while the chunk downloads.

Components to lazy-load (~18 total):
- `EmailTemplatesManager`, `EmailVariablesManager`, `SignaturePresetsManager`, `EmailBrandingSettings`
- `SmsTemplatesManager`
- `OnboardingTasksManager`, `OnboardingConfigurator`
- `LeaderboardConfigurator`, `LeaderboardWeightsManager`
- `IntegrationsTab`
- `StylistLevelsContent`
- `CommandCenterContent`
- `LocationsSettingsContent`, `DayRateSettingsContent`
- `RoleAccessConfigurator`
- `FormsTemplatesContent`, `MetricsGlossaryContent`
- `LoyaltySettingsContent`, `TeamRewardsConfigurator`
- `KioskSettingsContent`, `ServiceEmailFlowsManager`
- `ServicesSettingsContent`, `RetailProductsSettingsContent`
- `AccountBillingContent`

### 2. Defer `fetchUsers()` until the "Users" category is active

Move the `fetchUsers()` call from the top-level `useEffect` into the users category render path, so it only fires when the admin actually opens the Users section.

```ts
// Before:
useEffect(() => { fetchUsers(); }, []);

// After:
useEffect(() => {
  if (activeCategory === 'users') fetchUsers();
}, [activeCategory]);
```

## Impact

- **Initial load**: Only the grid of category cards + their icons need to render. The heavy content components are deferred.
- **Bundle splitting**: Vite will automatically code-split each lazy import into its own chunk.
- **No UX change**: The grid renders instantly; clicking a category shows a brief loader while the chunk downloads (typically <200ms on fast connections).

## Scope
- Single file: `src/pages/dashboard/admin/Settings.tsx`
- ~25 import lines changed from static to `lazy()`
- 1 `Suspense` wrapper added
- 1 `useEffect` condition added
- No database changes

