

## Fix: "Discard & Close" Toast Button Still Not Working

### Root Cause

`toast.dismiss()` (no arguments) is called inside the `onClick` of the toast's own action button. In sonner, calling `toast.dismiss()` without a toast ID inside an action handler can be unreliable — the action click event and the dismiss race each other. The toast ID needs to be captured and dismissed explicitly.

### Change

**File:** `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`

**Lines 1004–1016** — Capture the toast ID from `toast.warning()` and pass it to `toast.dismiss()`:

```tsx
<Dialog open={open} onOpenChange={(newOpen) => {
  if (!newOpen && isDirty) {
    const toastId = toast.warning('You have unsaved changes', {
      action: { label: 'Discard & Close', onClick: () => {
        toast.dismiss(toastId);
        initialBowlsRef.current = '';
        setTimeout(() => onOpenChange(false), 0);
      } },
      duration: 6000,
    });
    return;
  }
  onOpenChange(newOpen);
}}>
```

### Scope
- Single file, 1 line changed (`toast.dismiss()` → `toast.dismiss(toastId)`)
- Same pattern already used elsewhere in this file (lines 373, 405, 541) for undo toasts

