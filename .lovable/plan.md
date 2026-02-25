

## Fix: Cancelled Badge Should Use Red/Destructive Styling

The issue is in `src/lib/design-tokens.ts` line 225. The `cancelled` entry in `APPOINTMENT_STATUS_BADGE` uses gray colors (`bg-gray-100`, `text-gray-600`), making it look neutral instead of alerting. It should use red/destructive colors to match the semantic meaning of a cancellation.

### Change

**File:** `src/lib/design-tokens.ts` (line 225)

Update the `cancelled` entry from gray to red:

```typescript
// Before
cancelled:  { bg: 'bg-gray-100 dark:bg-gray-800/30',   text: 'text-gray-600 dark:text-gray-400',   border: 'border-gray-600/30 dark:border-gray-400/30',   label: 'Cancelled' },

// After
cancelled:  { bg: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-800 dark:text-red-300',    border: 'border-red-800/30 dark:border-red-300/30',    label: 'Cancelled' },
```

This propagates automatically to the Appointments Hub table, the detail drawer, and any other surface consuming `APPOINTMENT_STATUS_BADGE` -- no other files need changes.

### One file, one line changed

| File | Change |
|---|---|
| `src/lib/design-tokens.ts` | Update `cancelled` badge colors from gray to red |

