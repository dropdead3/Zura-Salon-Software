

## Fix: "Discard & Close" Toast Button Not Working

### Root Cause

The sonner toast `action.onClick` handler calls `onOpenChange(false)` to close the dialog. However, there's a timing issue: `initialBowlsRef.current = ''` sets isDirty to false, but the dialog is already open and Radix Dialog won't re-fire `onOpenChange`. The `onOpenChange(false)` call goes to the parent, which should set `open` to `false` — but the toast itself also needs to be dismissed, and sonner may not auto-dismiss on action click in all configurations.

Additionally, since the dialog unmount resets state, the `initialBowlsRef.current = ''` is unnecessary — we just need to force-close. The fix should:

1. Dismiss the toast explicitly via `toast.dismiss()`
2. Call `onOpenChange(false)` directly (bypassing the Dialog's interceptor, which it already does since it's the prop)

### Changes

**File:** `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`

**Line 1006–1009** — Update the toast action to dismiss itself and force-close:

```tsx
toast.warning('You have unsaved changes', {
  action: {
    label: 'Discard & Close',
    onClick: () => {
      toast.dismiss();
      initialBowlsRef.current = '';
      setTimeout(() => onOpenChange(false), 0);
    },
  },
  duration: 6000,
});
```

The `toast.dismiss()` clears the warning toast, `initialBowlsRef.current = ''` resets dirty state, and `setTimeout` ensures the state update propagates before closing — matching the same pattern used on line 697 for successful saves.

### Scope
- Single file, ~5 lines changed
- No logic or layout changes

