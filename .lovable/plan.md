

# Relabel "Portal" → "Supplier Website" + Add Disabled "Auto-Reorder (API)" Option

## Changes (4 files)

In each file, replace the "Portal" select item and add a disabled auto-reorder option:

**Before:**
```tsx
<SelectItem value="portal">Portal</SelectItem>
```

**After:**
```tsx
<SelectItem value="portal">Supplier Website</SelectItem>
<SelectItem value="auto_reorder" disabled className="opacity-50">
  Auto-Reorder (API) — Coming Soon
</SelectItem>
```

### Files
1. `src/components/dashboard/backroom-settings/AddSupplierWizard.tsx` — line 433
2. `src/components/dashboard/backroom-settings/BackroomSetupWizard.tsx` — line 670
3. `src/components/dashboard/backroom-settings/SupplierSettingsSection.tsx` — line 379
4. `src/components/dashboard/settings/inventory/SupplierDialog.tsx` — line 125: already says "Website / Portal", will update to "Supplier Website" for consistency and add the auto-reorder option

