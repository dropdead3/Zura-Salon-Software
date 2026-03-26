

## Replace `window.confirm` with Sonner Confirmation Toast

### Problem
`window.confirm()` triggers a native browser dialog — ugly, inconsistent with the app's design system, and breaks the immersive UX.

### Fix
Replace with a two-step pattern using Sonner, matching the existing "Discard & Close" toast pattern already used in the same dialog.

**File:** `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`

1. Remove the `window.confirm` call from `handleClearAllowance`
2. Create a new `confirmClearAllowance` function that shows a Sonner warning toast with a destructive "Clear Allowance" action button
3. When the user clicks the toast action, it calls the actual clear logic

```tsx
// Button click handler — shows confirmation toast
const confirmClearAllowance = useCallback(() => {
  toast.warning('Clear this allowance?', {
    description: 'All bowls and products will be removed.',
    action: {
      label: 'Clear Allowance',
      onClick: () => handleClearAllowance(),
    },
    duration: 6000,
  });
}, [handleClearAllowance]);

// Actual clear logic — remove the window.confirm guard
const handleClearAllowance = useCallback(async () => {
  if (!orgId) return;
  setSaving(true);
  // ... rest of existing logic unchanged
}, [/* deps */]);
```

4. Update the "Clear Allowance" button's `onClick` to call `confirmClearAllowance` instead of `handleClearAllowance`

### Scope
- Single file, ~10 lines changed
- Consistent with existing toast-based confirmation pattern in the dialog

