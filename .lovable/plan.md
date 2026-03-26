

## Round Suggested Price to $5 + Add Info Tooltip

### Changes

**1. `src/lib/backroom/allowance-health.ts`** — Add a `roundUpToNearest5` helper and apply it to `suggestedServicePrice`:

```ts
function roundUpTo5(v: number): number {
  return Math.ceil(v / 5) * 5;
}
```

Apply to line 78: `suggestedServicePrice = roundUpTo5(allowanceAmount / (TARGET_PCT / 100));`

Update the message string to use the rounded value.

**2. `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`** — Add a `MetricInfoTooltip` next to the suggested price button text:

- Tooltip content explains:
  - **How it's calculated**: "Based on the Vish 8% target — your after-markup product cost divided by 0.08, rounded up to the nearest $5."
  - **Where else to adjust**: "You can also adjust service pricing from **Price Intelligence** in the Backroom Hub, or from the **Services Configurator** in Organization Settings."

### Files

| File | Change |
|------|--------|
| `src/lib/backroom/allowance-health.ts` | Add `roundUpTo5` helper, apply to suggested price |
| `AllowanceCalculatorDialog.tsx` | Add `MetricInfoTooltip` next to the suggested price button |

