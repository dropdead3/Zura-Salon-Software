

# Rollout DashboardLoader Across Dashboard Section Loading States

## Scope

Replace standalone centered `Loader2` spinners used as **section/page loading indicators** in dashboard components with `<DashboardLoader />`. This does NOT touch:
- Button spinners (e.g. `{isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}`)
- Inline upload indicators
- Card-level loading inside `<CardContent>` with surrounding content
- Platform pages (those use a different theme system)
- Team chat / non-dashboard areas

## Target Files (~30 files)

**Dashboard analytics & settings sections** — full-section loaders like:
```tsx
// BEFORE
<div className="flex items-center justify-center py-12">
  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
</div>

// AFTER
<DashboardLoader size="md" className="py-12" />
```

### Confirmed candidates (from search):
1. `WeeklyLeverSection.tsx` — py-12 loader
2. `StylistLevelsEditor.tsx` — py-8 loader
3. `PromotionsList.tsx` — py-8 loader
4. `PromotionalServicesManager.tsx` — py-8 loader
5. `LoyaltyProgramConfigurator.tsx` — py-12 loader
6. `LoyaltyTiersEditor.tsx` — py-12 loader
7. `ServicesSettingsContent.tsx` — py-12 loader
8. `WebsiteSettingsContent.tsx` — 4 × py-12 loaders
9. `PurchaseOrdersPanel.tsx` — py-8 loader
10. `SupplierDialog.tsx` — py-8 loader
11. `GiftCardsHub.tsx` — py-12 loader + py-4 loader
12. `ServiceEmailFlowsManager.tsx` — 2 × py-4 loaders
13. `PagesManager.tsx` — h-64 loader
14. `ReengagementHub.tsx` — py-8 loader
15. `NotificationPreferences.tsx` — page-level loader
16. `OnboardingTracker.tsx` — page-level loader
17. `ChatLeadershipTab.tsx` — h-full loader

### Size mapping:
- `w-4 h-4` → `size="sm"`
- `w-5 h-5` / `h-6 w-6` → `size="md"`
- `w-8 h-8` → `size="lg"`

## Per-file change pattern
1. Remove `Loader2` from lucide import (if no other usage remains)
2. Add `import { DashboardLoader } from '@/components/dashboard/DashboardLoader'`
3. Replace the `<div className="flex..."><Loader2 .../></div>` block with `<DashboardLoader size="md" className="py-12" />` (preserving the original padding/height)

## Files modified
~17 files listed above, each with a small mechanical replacement.

