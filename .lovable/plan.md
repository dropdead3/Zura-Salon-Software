

## Replace Editable Service Price with Auto-Adjust Button

### Problem
The service price is currently an inline editable `<Input>` in the footer. The user wants it read-only, with a one-click button to adjust the price to the engine's suggested price (rounded up to nearest $5) when the allowance is too high.

### Changes

**File:** `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`

**1. Replace the inline editable input (lines 1530–1573)** with a static read-only display:
```
Service $225
```
Just text, no input field. Remove `modeledServicePrice` state usage in this section and the reset/apply buttons.

**2. Add a "Adjust to $X" button when `healthResult.status === 'high'`**

After the health badge (around line 1625), render a button styled as a subtle pill:

```tsx
{healthResult.status === 'high' && healthResult.suggestedServicePrice && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="outline"
        size="sm"
        className="h-7 px-3 text-[11px] rounded-full border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
        onClick={() => {
          const oldPrice = servicePrice;
          updateServicePriceMutation.mutate(healthResult.suggestedServicePrice!, {
            onSuccess: () => {
              toast(`Service price updated to $${healthResult.suggestedServicePrice}`, {
                action: oldPrice ? { label: 'Undo', onClick: () => updateServicePriceMutation.mutate(oldPrice) } : undefined,
                duration: 6000,
              });
            },
          });
        }}
      >
        Adjust to ${healthResult.suggestedServicePrice}
      </Button>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-[280px] text-xs">
      Based on your retail product cost of ${grandTotal.toFixed(2)}, raising the service price
      to ${healthResult.suggestedServicePrice} would bring product cost to the 8% industry target.
      Price is rounded up to the nearest $5.
    </TooltipContent>
  </Tooltip>
)}
```

**3. Update the `effectiveServicePrice` references** — since `modeledServicePrice` is no longer settable from this input, `effectiveServicePrice` will just be `servicePrice`. The `modeledServicePrice` state and its setter can be cleaned up if it's not used elsewhere. (Will verify during implementation.)

### Scope
- Single file, ~50 lines changed
- Replaces editable input with static text + action button
- Reuses existing `updateServicePriceMutation` and `suggestedServicePrice` from the health engine

