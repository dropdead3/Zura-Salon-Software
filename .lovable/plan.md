

## Fix: Services Disappearing After Linking a Product

### Problem
The "Map Components" step only shows services that have **zero** linked components (`!componentsByService.has(s.id)`). After linking a product, the query cache updates and the service vanishes — preventing users from adding additional products.

### Fix

**Line 91** — Change `trackedNoComponents` to show **all tracked services**, not just those without components. Rename to `trackedServices` for clarity.

```tsx
// Before
const trackedNoComponents = services.filter(s => s.is_backroom_tracked && !componentsByService.has(s.id));

// After
const trackedServices = services.filter(s => s.is_backroom_tracked);
const trackedNoComponents = trackedServices.filter(s => !componentsByService.has(s.id));
```

**Lines 282–301** — Render `trackedServices` in the list (so all tracked services always appear), but use `trackedNoComponents.length` only for the progress counter/message. Services with linked components show their "X linked" badge; services without show the helper text.

- The "StepComplete" message triggers when `trackedNoComponents.length === 0` (unchanged)
- The counter text: `"{trackedNoComponents.length} service(s) still need at least one linked product."`
- The list iterates `trackedServices` instead of `trackedNoComponents`

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingQuickSetup.tsx`

