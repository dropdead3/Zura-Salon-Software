

## Add Allowance Explainer Text

### Changes — `AllowanceCalculatorDialog.tsx`

1. **Dialog description**: Below the current subtitle, add a concise explainer in `text-xs text-muted-foreground/70`:

   > "Product allowance is the dollar value of product included in a service, based on your standard product line. If you also carry a premium line and use it for the same service, you'll reach the allowance faster — the higher cost per gram means less product before hitting the limit. Once the allowance is exceeded, overage costs are automatically passed to the client at checkout so your salon recoups the difference."

2. **Empty state text**: Replace generic "Select a brand below…" with:
   - Primary: "Add products to build a sample formula"
   - Secondary: "Select a brand below, then choose products. Developers are auto-detected."

### Files Modified
- `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`

