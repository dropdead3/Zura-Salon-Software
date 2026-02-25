

## Remove "Tips by Service Category" and "Tips by Payment Method" from Tips Drilldown

The screenshot confirms these two sections at the bottom of the drilldown. Three blocks to remove:

### Changes in `src/components/dashboard/sales/TipsDrilldownPanel.tsx`

1. **Lines 202-213** — Remove "Tips by Service Category" block from the **self-view**
2. **Lines 335-346** — Remove "Tips by Service Category" block from the **leadership view**
3. **Line 349** — Remove `<TipPaymentMethodBreakdown>` from the **leadership view**

Also clean up any now-unused imports (`TipPaymentMethodBreakdown`, `CategoryRows`, and related variables like `sortedCategories`, `totalCategoryTips`, `byPaymentMethod` if they become orphaned).

### Scope

~30 lines removed, 0 added. The drilldown will show only: Summary Stats → Tips by Stylist → Avg Tip Rate Ranking → Coaching Opportunities.

