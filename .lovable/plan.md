

## Fix: Top Bar Hide/Unhide Button Should Not Show Confirmation Dialog

### Problem
The "Show/hide $" button in the top bar shows a confirmation dialog when clicking to reveal numbers. This is unnecessary friction — the button is a deliberate, explicit action. The confirmation dialog should only appear when clicking on a blurred number inline on the page (via `requestUnhide`).

### Root Cause
In `HideNumbersContext.tsx`, `toggleHideNumbers` (used by the top bar button) routes through the confirmation dialog on line 134 when `hideNumbers` is true — identical behavior to `requestUnhide`. The comment on line 127 acknowledges this should bypass confirmation, but the implementation doesn't.

### Fix
**Single file change: `src/contexts/HideNumbersContext.tsx`**

Update `toggleHideNumbers` to directly unhide without showing the confirmation dialog:

```typescript
// Line 128-153: toggleHideNumbers
const toggleHideNumbers = async () => {
  if (!user) return;
  const newValue = !hideNumbers;
  setHideNumbers(newValue);
  
  try {
    await supabase
      .from('employee_profiles')
      .update({ hide_numbers: newValue })
      .eq('user_id', user.id);
  } catch (err) {
    console.error('Error saving hide_numbers preference:', err);
    setHideNumbers(!newValue);
  }
};
```

Remove the confirmation branch (lines 133-137). Both hiding and unhiding via the explicit top bar button will toggle directly. The `requestUnhide` function (used by `BlurredAmount` and `AnimatedBlurredAmount` when clicking inline blurred values) continues to show the confirmation dialog as before.

