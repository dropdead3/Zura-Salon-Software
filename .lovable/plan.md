

# Replace Org Dashboard Section Loaders with Zura Z Disco Icon

## Scope
There are ~260 files with `Loader2 animate-spin` across the org dashboard. These fall into two categories:
1. **Section/page-level loaders** — centered in a container (`flex items-center justify-center`), sizes w-5 to w-8. These are the visible "loading page" spinners. **Replace these.**
2. **Inline/button spinners** — small (w-3.5, w-4) inside buttons like "Save", "Create", etc. **Leave these as Loader2.**

## Approach

### 1. Create a `DashboardLoader` convenience wrapper
A new `src/components/dashboard/DashboardLoader.tsx` component that renders a centered `ZuraLoader` with sensible defaults for the org dashboard context. This avoids repeating the centering wrapper in every file.

```tsx
// Wraps ZuraLoader in a flex-center container
// size defaults to "lg", className allows height overrides like "py-12" or "h-64"
export function DashboardLoader({ size = 'lg', className }: Props)
```

Uses `ZuraLoader` without `platformColors` — so it renders in `bg-foreground/80` which inherits the org's selected theme (light or dark).

### 2. Batch-replace section-level loaders across highest-traffic files
Replace patterns like:
```tsx
<div className="flex items-center justify-center py-12">
  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
</div>
```
With:
```tsx
<DashboardLoader className="py-12" />
```

**Priority files** (most visible org dashboard loading states):
- `src/components/dashboard/settings/HandbooksContent.tsx`
- `src/components/dashboard/analytics/ServicesContent.tsx` (6 loaders)
- `src/components/dashboard/analytics/RetailAnalyticsContent.tsx`
- `src/components/dashboard/settings/RetailProductsSettingsContent.tsx` (4 loaders)
- `src/components/dashboard/website-editor/SectionDisplayEditor.tsx`
- `src/components/dashboard/website-editor/navigation/NavigationManager.tsx`
- `src/components/dashboard/schedule/QuickBookingPopover.tsx`
- `src/components/dashboard/settings/inventory/SupplierDialog.tsx`
- `src/components/dashboard/settings/BusinessSettingsDialog.tsx` (upload spinners)
- `src/pages/dashboard/admin/StylistLevels.tsx`
- `src/pages/dashboard/admin/HomepageStylists.tsx` (3 loaders)
- `src/pages/dashboard/admin/FeatureFlags.tsx`
- `src/pages/dashboard/admin/BackroomSubscription.tsx`
- `src/pages/dashboard/Progress.tsx`
- `src/pages/dashboard/CampaignDetail.tsx`
- `src/pages/dashboard/platform/Onboarding.tsx`
- `src/components/dashboard/settings/ServiceEmailFlowsManager.tsx` (2 loaders)
- The backroom settings hub components (visible in the screenshot)

### 3. Leave alone
- All `Loader2` instances inside `<Button>` elements (inline action spinners)
- Toggle/switch loading indicators (w-4 h-4 contextual)
- Platform components (already converted)

### Files modified
- **New**: `src/components/dashboard/DashboardLoader.tsx`
- **~20 org dashboard files**: swap section-level `Loader2` → `DashboardLoader`

