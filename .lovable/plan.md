

## Fix X Button / "Discard & Close" Not Closing the Dialog

### Root Cause

The "Discard & Close" toast action calls `onOpenChange(false)` directly — the prop. This should close the dialog by setting the parent's `calculatorServiceId` to `null`. However, the closure captures the `onOpenChange` prop reference from the render when the toast was created. Since the parent's `onOpenChange` is an inline function `(open) => { if (!open) setCalculatorServiceId(null); }` that gets recreated on each render, the stale reference may not propagate correctly in all cases.

Additionally, the `skipDirtyCheckRef` mechanism is fragile — it only helps if Radix's `onOpenChange` wrapper fires again, but calling the prop directly bypasses Radix entirely.

### Fix

**File:** `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`

Replace the toast-based close with a `forceClose` state + `useEffect` pattern. This avoids stale closure issues entirely:

1. Add a `forceClose` state: `const [forceClose, setForceClose] = useState(false);`

2. Add a `useEffect` that watches `forceClose`:
```tsx
useEffect(() => {
  if (forceClose) {
    setForceClose(false);
    onOpenChange(false);
  }
}, [forceClose, onOpenChange]);
```

3. Update the toast "Discard & Close" action to simply set state:
```tsx
onClick: () => {
  toast.dismiss(toastId);
  setForceClose(true);
}
```

4. Update the `onOpenChange` wrapper to also check `forceClose`:
```tsx
onOpenChange={(newOpen) => {
  if (!newOpen && isDirty) {
    const toastId = toast.warning('You have unsaved changes', {
      action: { label: 'Discard & Close', onClick: () => {
        toast.dismiss(toastId);
        setForceClose(true);
      }},
      duration: 6000,
    });
    return;
  }
  onOpenChange(newOpen);
}}
```

5. Remove `skipDirtyCheckRef` entirely — no longer needed.

### Why This Works

- `setForceClose(true)` triggers a re-render
- The `useEffect` runs with the CURRENT `onOpenChange` prop (not a stale closure)
- Clean separation between "user wants to close" (state) and "execute the close" (effect)

### Scope
- Single file, ~10 lines changed
- Removes `skipDirtyCheckRef`, adds `forceClose` state + effect

