
## Fix Rachel’s missing service on the Formulations tab

### Root cause
`Natural Root Retouch` is already present in the demo services catalog, so this is not a demo-data wiring issue.

The actual problem is the chemical-service filter:
- `DockServicesTab` builds the mixable service sections from `getChemicalServices(appointment.service_name)`
- `getChemicalServices()` relies on `isColorOrChemicalService()`
- In `src/utils/serviceCategorization.ts`, the regex matches `root touch` but not `retouch` / `root retouch`

So for Rachel’s appointment:
- `Natural Root Retouch` gets filtered out
- `Glaze Add On` passes
- Result: only Glaze Add On appears on the Formulations page

### Implementation

**1. Update `src/utils/serviceCategorization.ts`**
Expand the color/chemical matching patterns to include retouch variants:
- `retouch`
- `root retouch`
- `touch up`
- `touch-up`

Apply this to both:
- the Color category pattern in `CATEGORY_PATTERNS`
- the `COLOR_CHEMICAL_PATTERN` used by `isColorOrChemicalService()`

### Why this is the right fix
This preserves the existing demo service name (`Natural Root Retouch`), which already matches the demo service list exactly, and fixes the real issue at the shared classification layer.

That means the fix will also improve any other areas that rely on the same helper, including:
- Formulations tab service grouping
- schedule filtering for chemical/color appointments
- any future demo or real appointment using “retouch” naming

### Files to change
- `src/utils/serviceCategorization.ts`

### Expected result
Rachel Kim’s demo appointment will show both:
- `Natural Root Retouch`
- `Glaze Add On`

on the Formulations page, so a bowl can be mixed for either service.
