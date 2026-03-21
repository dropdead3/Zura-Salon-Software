

## Change Delete Button to Clear Button

**File:** `src/components/dock/DockPinGate.tsx`

Two changes:

1. **Line 38-41** — Change the `'delete'` handler from removing the last digit to clearing the entire PIN:
   ```ts
   if (key === 'delete') {
     setPin('');
     setError(false);
     return;
   }
   ```

2. **Lines 139-145** — Replace the `Delete` icon with a text label "Clear" to communicate the new behavior:
   ```tsx
   <button ...>
     <span className="text-sm font-medium tracking-wide">Clear</span>
   </button>
   ```

Single file, two small edits.

