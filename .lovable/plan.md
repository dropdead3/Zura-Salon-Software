

## Remove Remaining `as any` Type Casts

All three remaining `as any` casts in `AllowanceCalculatorDialog.tsx` are unnecessary — the `services` and `service_recipe_baselines` tables are fully defined in the generated types with all referenced columns (`price`, `bowl_id`, `cost_per_unit_snapshot`, `is_developer`, `developer_ratio`).

### Changes

**File: `AllowanceCalculatorDialog.tsx`**

1. **Line 310–311** — Remove casts on services update:
   - `.from('services' as any)` → `.from('services')`
   - `.update({ price: newPrice } as any)` → `.update({ price: newPrice })`

2. **Line 580** — Remove cast on service_recipe_baselines update:
   - `} as any)` → `})`

3. **Line 319** — Clean up error type:
   - `(err: any)` → `(err: Error)` (minor, consistent with other mutation handlers)

No functional changes — purely type safety cleanup.

