

## Show All Retail Categories (Including Zero Amounts)

### Problem
Line 1007 in `AggregateSalesCard.tsx` filters out categories where both amount and count are zero:
```js
.filter(c => c.amount > 0 || c.count > 0);
```
This hides Gift Cards (and any other category with no sales) from the breakdown.

### Fix
**`src/components/dashboard/AggregateSalesCard.tsx`** (line 1007)
- Remove the `.filter(c => c.amount > 0 || c.count > 0)` call so all 4 categories (Products, Merch, Gift Cards, Extensions) always display in the breakdown regardless of revenue.

One-line change.

