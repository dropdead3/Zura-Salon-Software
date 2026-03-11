

## Fix: Edit Button Crash on Product Form

### Root Cause
The `ProductFormDialog` component (line 288 in `RetailProductsSettingsContent.tsx`) renders a `<SelectItem value="">All Locations</SelectItem>`. Radix UI's Select component throws an error when any `SelectItem` has an empty string value — this is the runtime error shown in console: *"A Select.Item must have a value prop that is not an empty string."*

When the edit button opens the dialog and the Location select renders, it crashes and triggers the ErrorBoundary.

### Fix
**`src/components/dashboard/settings/RetailProductsSettingsContent.tsx`** — Line 288

Change `<SelectItem value="">All Locations</SelectItem>` to `<SelectItem value="all">All Locations</SelectItem>`, and handle the `"all"` sentinel value by converting it back to an empty string/null when saving.

- Line 285: Update `value` prop to convert empty/null `location_id` to `"all"` for the select
- Line 288: Change value from `""` to `"all"`
- In `onValueChange`, convert `"all"` back to empty string

Single-line fix, no structural changes.

