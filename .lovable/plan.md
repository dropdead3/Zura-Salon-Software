

## Remove Filter Badge from Revenue Breakdown Card

### Problem
The Revenue Breakdown card (inside the Sales Overview right sidebar) shows its own "All Locations / Last 30 days" filter badge, which is redundant since those filters are already displayed on the parent Sales Overview card header.

### Fix

**File: `src/components/dashboard/AggregateSalesCard.tsx` (line 994)**

Remove the `filterContext` prop from the `RevenueDonutChart` component:

```
// Before
<RevenueDonutChart
  serviceRevenue={displayMetrics.serviceRevenue} 
  productRevenue={displayMetrics.productRevenue}
  size={64}
  filterContext={filterContext as any}
  retailAttachmentRate={attachmentData?.attachmentRate}
  retailAttachmentLoading={attachmentLoading}
/>

// After
<RevenueDonutChart
  serviceRevenue={displayMetrics.serviceRevenue} 
  productRevenue={displayMetrics.productRevenue}
  size={64}
  retailAttachmentRate={attachmentData?.attachmentRate}
  retailAttachmentLoading={attachmentLoading}
/>
```

Since `filterContext` is optional in `RevenueDonutChart`, removing it will simply hide the `AnalyticsFilterBadge` -- no other changes needed.

