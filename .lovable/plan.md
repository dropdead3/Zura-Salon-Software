

## Add "Cha-Ching" Toast on New Transactions

**Approach**: Enhance the existing realtime subscription in `useTodayActualRevenue.ts` to detect when revenue *increases* (not just any change) and fire a tasteful sonner toast with a cha-ching sound effect via `useNotificationSound`.

Since `useTodayActualRevenue` is a data hook (not a component), and sonner's `toast()` is callable anywhere, we'll track the previous revenue total via a ref and compare after each realtime-triggered refetch.

### File: `src/hooks/useTodayActualRevenue.ts`

1. **Track previous revenue** — Add a `useRef` to store the last-known `actualRevenue` value.

2. **Detect revenue increase** — In a `useEffect` watching `actualRevenueQuery.data`, compare the new total against the ref. If it increased and `hasData` is true, calculate the delta and fire a toast + sound.

3. **Toast + Sound** — Import `toast` from `sonner` and `useNotificationSound`. Show a custom toast like:
   ```
   💰 Cha-ching! — A client just checked out for $125.00
   ```
   Play the `playSuccess` sound (or a new `'achievement'` sound for the cha-ching feel). The delta (`newRevenue - prevRevenue`) is the checkout amount displayed.

4. **Guard against initial load** — The ref starts as `null` so the first data load sets the baseline without triggering a toast.

### Changes

```tsx
// New imports
import { useRef } from 'react'; // already have useEffect
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';

// Inside the hook, after actualRevenueQuery definition:
const prevRevenueRef = useRef<number | null>(null);

useEffect(() => {
  const currentRevenue = actualRevenueQuery.data?.totalRevenue ?? 0;
  const hasData = actualRevenueQuery.data?.hasData ?? false;

  if (prevRevenueRef.current === null) {
    // First load — set baseline, no toast
    prevRevenueRef.current = currentRevenue;
    return;
  }

  if (hasData && currentRevenue > prevRevenueRef.current) {
    const delta = currentRevenue - prevRevenueRef.current;
    toast('💰 Cha-ching!', {
      description: `A client just checked out for ${formatCurrency(delta)}`,
      duration: 5000,
    });
  }

  prevRevenueRef.current = currentRevenue;
}, [actualRevenueQuery.data]);
```

### Files changed
- `src/hooks/useTodayActualRevenue.ts` — add revenue delta detection + sonner toast notification

