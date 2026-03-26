

## Right-Align Filters — Rule + Tokenization

### Problem
The "All Locations" filter on Price Intelligence (and similar toggle/select filters across pages) is left-aligned. The design standard calls for filters to be anchored to the right side of their container row, consistent with the existing memory rule: *"all filters (Location and Time Range) are anchored to the right-hand side of section headers."*

### Changes

#### 1. Add `tokens.layout.filterRow` token

**File: `src/lib/design-tokens.ts`** — Add to the `layout` section:

```ts
/** Filter strip row — right-aligns filter controls. Use below page headers or section headers. */
filterRow: 'flex items-center justify-end gap-3 flex-wrap',
```

#### 2. Add design system rule

**File: `.cursor/rules/design-system.mdc`** — Add a new section under "Component Styling":

```
## Filter Positioning (HARD RULE)

Toggle filters, location selects, date-range tabs, and any page/section-level filter controls MUST be right-aligned using `tokens.layout.filterRow`:

\```tsx
<div className={tokens.layout.filterRow}>
  <LocationSelect ... />
  <Tabs ...><TabsList>...</TabsList></Tabs>
</div>
\```

Filters sitting in a `justify-between` header row (title left, filters right) satisfy this rule automatically. Standalone filter rows below headers MUST use `tokens.layout.filterRow`.
```

#### 3. Apply to Price Intelligence page

**File: `src/pages/dashboard/admin/PriceRecommendations.tsx` (~line 194)**

Replace:
```tsx
<div className="flex items-center gap-3">
```
With:
```tsx
<div className={tokens.layout.filterRow}>
```

This right-aligns the LocationSelect on the page.

#### 4. Audit other standalone filter rows

Scan for similar left-aligned filter containers on `LeadManagement.tsx` and other admin pages, applying `tokens.layout.filterRow` where filters sit outside a `justify-between` header.

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/design-tokens.ts` | Add `layout.filterRow` token |
| `.cursor/rules/design-system.mdc` | Add "Filter Positioning" hard rule |
| `src/pages/dashboard/admin/PriceRecommendations.tsx` | Use `tokens.layout.filterRow` on location filter container |
| `src/pages/dashboard/admin/LeadManagement.tsx` | Audit and apply if applicable |

