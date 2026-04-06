

# Fix PageExplainer Spacing

## Problem
The `PageExplainer` component renders with no bottom margin. When visible, it sits flush against the next element (tabs, cards, content). When dismissed, the `mb-8` from `DashboardPageHeader` handles spacing fine — but when the explainer is showing, there's no gap between it and the content below.

This affects all 109 pages that use `<PageExplainer />`.

## Fix
Add `mb-6` as a default className inside the `PageExplainer` component itself. This is the single-point fix that ensures consistent spacing everywhere without touching 109 page files.

### Change in `src/components/ui/PageExplainer.tsx`

Update the `Infotainer` render to include `mb-6` merged with any custom className:

```tsx
<Infotainer
  id={`page-explainer-${pageId}`}
  title={entry.title}
  description={entry.description}
  icon={IconComponent ? <IconComponent className="h-4 w-4" /> : undefined}
  className={cn('mb-6', className)}
/>
```

This requires importing `cn` from `@/lib/utils`.

## Files

| File | Change |
|------|--------|
| `src/components/ui/PageExplainer.tsx` | Import `cn`, add `mb-6` default to Infotainer className |

One file. One line change. No database changes.

