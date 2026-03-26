

## Add Confirmation Dialog Before Price Adjustment

### What changes

**File:** `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`

**1. Add state for confirmation dialog**
```tsx
const [showPriceConfirm, setShowPriceConfirm] = useState(false);
```

**2. Replace both `onClick` handlers (lines 1589 and 1639)** to open the dialog instead of mutating directly:
```tsx
onClick={() => setShowPriceConfirm(true)}
```

**3. Add an `AlertDialog` at the bottom of the component** (before the closing fragment), using the existing `AlertDialog` UI components and matching the project's dialog styling:

- **Icon**: `DollarSign` in a branded circle (same pattern as `UsePassConfirmDialog`)
- **Title**: "Confirm Service Price Adjustment"
- **Body explainer** (3 items):
  - Current price → New price with arrow visual (same pattern as `PriceAcceptConfirmDialog`)
  - Bullet list of where the new price will surface: Service Tracking, Price Intelligence, public website services page, location/level overrides
  - Note: "Price is rounded up to the nearest $5 based on your retail product cost of $X and the 8% industry target."
- **Footer**: Cancel + "Confirm Adjustment" button
- **On confirm**: runs the existing `updateServicePriceMutation.mutate()` logic with the undo toast

**4. Remove the duplicate standalone button block (lines 1632–1664)** — the inline button at line 1587 is the only trigger needed.

### Scope
- Single file, ~40 lines added (dialog), ~35 lines removed (duplicate button block)
- Reuses existing `AlertDialog` components and `PriceAcceptConfirmDialog` visual patterns
- No new files needed

