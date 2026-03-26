

## Move Price Intelligence into Zura Backroom Hub

### Problem
Price Intelligence is a standalone page (`/admin/price-recommendations`) with its own sidebar nav entry showing as raw `nav.price_intelligence`. It should live inside the Backroom Hub as a section, consistent with the hub's sidebar architecture.

### Changes

#### 1. Add "Price Intelligence" section to BackroomSettings sidebar

**File: `src/pages/dashboard/admin/BackroomSettings.tsx`**

- Add `'price-intelligence'` to the `BackroomSection` union type
- Add a new entry in `sections` array under the `operations` group:
  ```ts
  { id: 'price-intelligence', label: 'Price Intelligence', icon: DollarSign, tooltip: 'Margin analysis and price recommendations.', group: 'operations' },
  ```
- Import `PriceRecommendationsContent` (a new wrapper) and render it in the content area:
  ```tsx
  {activeSection === 'price-intelligence' && <PriceRecommendationsContent />}
  ```

#### 2. Extract page content into an embeddable component

**File: `src/pages/dashboard/admin/PriceRecommendations.tsx`**

- Extract the inner content (everything inside `<DashboardLayout>`) into a new exported component `PriceRecommendationsContent` that renders without `DashboardLayout` or `DashboardPageHeader` (the hub provides its own shell).
- Keep the default export as-is for backward compatibility / redirect.

#### 3. Remove from sidebar nav

**File: `src/config/dashboardNav.ts`**

- Remove the `price_intelligence` entry from `appsNavItems` so it no longer appears as a separate sidebar item.

#### 4. Add route redirect for bookmarks

**File: `src/App.tsx`**

- Keep the existing route but redirect `/admin/price-recommendations` → `/admin/backroom-settings?section=price-intelligence` so existing bookmarks and deep links still work.

#### 5. Update internal links

- **`PriceRecommendationCard.tsx`**: Update link from `/admin/price-recommendations` → `/admin/backroom-settings?section=price-intelligence`
- **`PricingAnalyticsContent.tsx`**: Update navigate target similarly
- **`PriceRecommendations.tsx` empty state**: Update the `dashPath('/admin/backroom?section=formulas')` link to use `backroom-settings` if that's the correct hub path

#### 6. Handle deep-link from URL params

**File: `src/pages/dashboard/admin/BackroomSettings.tsx`**

- The existing `useSearchParams` logic already reads `section` from the URL and sets `activeSection`. Just ensure `'price-intelligence'` is recognized — it will be, since it's added to the `BackroomSection` type and the section map.

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/dashboard/admin/BackroomSettings.tsx` | Add section type, nav entry, content render |
| `src/pages/dashboard/admin/PriceRecommendations.tsx` | Extract content component, convert page to redirect |
| `src/config/dashboardNav.ts` | Remove `price_intelligence` from `appsNavItems` |
| `src/App.tsx` | Redirect old route to hub |
| `src/components/dashboard/backroom-settings/PriceRecommendationCard.tsx` | Update link target |
| `src/components/dashboard/analytics/PricingAnalyticsContent.tsx` | Update navigate target |

