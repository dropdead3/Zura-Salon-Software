

## Move MetricInfoTooltip Inline with Card Title

### Problem
The info icon is currently nested *inside* the `CardTitle` element, causing it to render below the title text instead of inline to its right.

### Change

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`**

**Lines 549–553** — Wrap `CardTitle` and `MetricInfoTooltip` in a flex row:

```tsx
// Before
<div>
  <CardTitle className={tokens.card.title}>
    All Services
    <MetricInfoTooltip description="..." />
  </CardTitle>
  <CardDescription>...</CardDescription>
</div>

// After
<div>
  <div className="flex items-center gap-2">
    <CardTitle className={tokens.card.title}>All Services</CardTitle>
    <MetricInfoTooltip description="Complete view of all active services. Toggle tracking, view configuration status, and identify gaps." />
  </div>
  <CardDescription>...</CardDescription>
</div>
```

This matches the canonical card header pattern from the UI canon and the same pattern used on the Command Center cards.

