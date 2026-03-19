

# Toggle Secondary Contact with "+ Add another contact" Button

## Overview
In all four files that render a "Secondary Contact" section, wrap the section in a collapsible toggle: hidden by default, revealed when the user clicks a "+ Add another contact" button. If any secondary contact field already has data (edit mode), show it expanded by default.

## Files to update (same pattern in each)

1. **`src/components/dashboard/backroom-settings/AddSupplierWizard.tsx`** — Add `showSecondary` state to `SupplierDetailsStep`, default `false`. Replace the `<div className="border-t ...">` secondary block with: a `Button variant="ghost"` reading "+ Add another contact" (with a `Plus` icon) that sets `showSecondary = true`, and conditionally render the fields when true. Include a small "Remove" button to collapse back.

2. **`src/components/dashboard/backroom-settings/BackroomSetupWizard.tsx`** — Same pattern inside `SuppliersStep`: add local `showSecondary` state, default to `true` if any secondary field is non-empty, otherwise `false`.

3. **`src/components/dashboard/backroom-settings/SupplierSettingsSection.tsx`** — Same pattern in the contact form. Default expanded if existing data is present.

4. **`src/components/dashboard/backroom-settings/inventory/SupplierAssignDialog.tsx`** — Same pattern.

## UI detail
- The toggle button sits where the "Secondary Contact" heading currently is, on the border-top divider line.
- Button style: `variant="ghost" size="sm"` with `Plus` icon, text "+ Add another contact".
- When expanded, a small `X` or "Remove" link appears next to the "Secondary Contact" heading to collapse (and optionally clear fields).

