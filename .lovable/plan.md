
Fix the reorder-method bug by correcting the actual cause instead of the previous partial workaround.

Issue
- After choosing `Other`, picking `Email` / `Phone` / `Portal` can fail or revert, so the selection does not persist.

Do I know what the issue is? Yes.

Root cause
- The previous fix still used Tailwind `hidden`, which is `display: none`; that still removes the extra field from layout, so the form shifts right when a new option is clicked.
- In `SupplierSettingsSection`, the select also lives inside a form/react-hook-form flow, so I should guard against spurious empty-string `onValueChange` events from Radix instead of accepting every value.

Implementation
1. Update these files:
   - `src/components/dashboard/backroom-settings/AddSupplierWizard.tsx`
   - `src/components/dashboard/backroom-settings/BackroomSetupWizard.tsx`
   - `src/components/dashboard/backroom-settings/SupplierSettingsSection.tsx`
2. Replace the current `hidden` pattern for “Specify method...” with a non-collapsing wrapper:
   - keep the input mounted
   - reserve stable space under the select
   - hide visually with `opacity-0` / `invisible` / `pointer-events-none` instead of `display:none`
3. Harden each select handler:
   - ignore empty values (`if (!value) return`)
   - update `reorder_method` only for real selections
   - clear `reorder_method_other` only when the new value is not `other`
4. Keep the existing save logic, since persistence is already wired correctly once the UI state stops reverting.

Technical notes
- `src/components/dashboard/settings/inventory/SupplierDialog.tsx` does not have an `Other` reorder option, so it is not part of this fix.
- No backend changes are needed.

Verification
- In each affected screen, test:
  1. select `Other`
  2. type a custom method
  3. switch to `Email`, `Phone`, and `Portal`
  4. save
  5. reopen and confirm the chosen method persisted correctly
