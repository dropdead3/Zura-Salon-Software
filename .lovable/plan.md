

# Fix: Reorder Method Select Stuck on "Other"

## Root Cause
When "Other" is selected, an `Input` is conditionally rendered (`{value === 'other' && <Input ... />}`). When the user opens the dropdown again and picks a different option, the state change causes the Input to unmount mid-interaction, which triggers a layout shift that interferes with Radix Select's internal close/commit cycle — the value reverts or doesn't apply.

## Fix
In all four files that have this pattern, replace the conditional render (`{value === 'other' && <Input />}`) with an always-rendered Input that uses a `hidden` class when not needed. This prevents layout shifts during Select value changes.

### Files to update (same pattern in each)

1. **`src/components/dashboard/backroom-settings/AddSupplierWizard.tsx`** (~line 426)
2. **`src/components/dashboard/backroom-settings/BackroomSetupWizard.tsx`** (~line 657)
3. **`src/components/dashboard/backroom-settings/SupplierSettingsSection.tsx`** (~line 371)
4. **`src/components/dashboard/settings/inventory/SupplierDialog.tsx`** (if same pattern)

**Before:**
```tsx
{reorderMethod === 'other' && (
  <Input value={...} onChange={...} placeholder="Specify method..." className="mt-1.5" />
)}
```

**After:**
```tsx
<Input
  value={...}
  onChange={...}
  placeholder="Specify method..."
  className={cn("mt-1.5", reorderMethod !== 'other' && "hidden")}
/>
```

This keeps the Input in the DOM at all times, preventing the layout shift that breaks the Select.

