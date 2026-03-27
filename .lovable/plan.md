

## Gap Analysis: Service Tracking, Pricing & Dock Billing — Pass 7

### Bug 1 (Medium): `CheckoutUsageCharge` Interface Missing Fields

The `CheckoutUsageCharge` TypeScript interface (line 9–28 of `useCheckoutUsageCharges.ts`) is missing three columns that exist in the database and are actively used:
- `charge_type` (used in `CheckoutClarityPanel`, `CheckoutSummarySheet`, `DockServicesTab`)
- `product_wholesale_cost` (used in `CheckoutClarityPanel` profit calculation)
- `product_charge_markup_pct` (used in `CheckoutClarityPanel` breakdown)

Every consumer accesses these via `(charge as any).charge_type`, which defeats type safety and could silently break if column names change.

**Fix:** Add the three missing fields to the `CheckoutUsageCharge` interface. Remove all `as any` casts on charge objects in consumers.

### Bug 2 (Medium): `useCalculateOverageCharge` Insert Uses `as any` on Typed Table

Lines 171–186 and 288–307 of `useCalculateOverageCharge.ts` cast the entire insert payload `as any`. The `checkout_usage_charges` table IS in the typed schema (types.ts line 3948), so these casts are unnecessary and hide type errors. The `charge_type: 'overage' as any` cast on line 182 is particularly suspicious — the column is typed as `string`, so no cast is needed.

**Fix:** Remove all `as any` casts from `checkout_usage_charges` inserts. The typed schema accepts these fields directly.

### Gap 3 (Medium): Allowance Overage Charges Not Surfaced in Checkout Summary

`CheckoutSummarySheet` (line 135) filters charges to only `charge_type === 'product_cost'`. Allowance-mode overage charges (`charge_type === 'overage'`) are never included in the checkout total. This means clients who exceed their included allowance get charged $0 at checkout.

**Fix:** Include overage charges in `CheckoutSummarySheet` as a separate line item (e.g., "Additional Product Usage: $X.XX") below the product cost charges. Non-waived overage charges should be added to the checkout total.

### Gap 4 (Low): Timeline Only Shows First Session

`DockSummaryTab` line 104: `<DockSessionTimeline sessionId={allSessionIds[0]} />` — only the first session's event timeline is shown. Multi-session appointments lose visibility into events from other sessions.

**Fix:** Render a `DockSessionTimeline` for each session ID, or merge events from all sessions into a single unified timeline.

### Gap 5 (Low): No Charge Estimate Before Completion (Carryover)

The completion sheet still shows zero charges on first open because charges are created during the completion callback. The `pendingCharges` prop maps `existingCharges` which are empty pre-completion.

**Fix:** Compute an inline estimate using `sessionStats.totalCost` and `backroom_billing_settings.default_product_markup_pct` to show "Estimated charge: ~$X.XX" in the completion sheet before the user taps Complete.

---

### Implementation Order

1. **Update `CheckoutUsageCharge` interface** — Bug 1 (type safety across 3 consumers)
2. **Remove `as any` casts from charge inserts** — Bug 2
3. **Surface overage charges in CheckoutSummarySheet** — Gap 3 (missing revenue)
4. **Multi-session timeline in DockSummaryTab** — Gap 4
5. *(Optional)* Pre-completion charge estimate — Gap 5

### Scope
- 4 files modified: `useCheckoutUsageCharges.ts`, `useCalculateOverageCharge.ts`, `CheckoutSummarySheet.tsx`, `DockSummaryTab.tsx`
- Remove `as any` casts from `CheckoutClarityPanel.tsx`
- No database migrations
- No breaking changes

