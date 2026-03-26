

## Fix "Discard & Close" Button Not Working

### Root Cause

The `onOpenChange` handler checks `isDirty` before allowing close. When "Discard & Close" is clicked, it resets `initialBowlsRef.current = ''` then calls `onOpenChange(false)` via `setTimeout`. But `isDirty` is a `useMemo` that only recomputes when `bowls` or `modeledServicePrice` change — the ref mutation doesn't trigger recomputation. So `isDirty` is still `true` on the next tick, and the handler shows the warning toast again in an infinite loop.

### Fix

**File:** `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`

Add a `skipDirtyCheckRef` flag:

```tsx
const skipDirtyCheckRef = useRef(false);
```

In the "Discard & Close" `onClick`, set the flag before calling close:

```tsx
onClick: () => {
  toast.dismiss(toastId);
  skipDirtyCheckRef.current = true;
  onOpenChange(false);
}
```

In the `onOpenChange` handler, check and reset the flag:

```tsx
onOpenChange={(newOpen) => {
  if (skipDirtyCheckRef.current) {
    skipDirtyCheckRef.current = false;
    onOpenChange(newOpen);
    return;
  }
  if (!newOpen && isDirty) { ... }
  onOpenChange(newOpen);
}}
```

Also remove the now-unnecessary `initialBowlsRef.current = ''` and `setTimeout` wrapper.

### Scope
- Single file, ~6 lines changed
- Fixes the loop where dirty check blocks the discard action

