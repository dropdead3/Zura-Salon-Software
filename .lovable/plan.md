

## Default Time Selection to "Now"

Currently the time defaults to `'09:00'` on line 84. It should default to the nearest 30-minute time slot based on the org's current time.

### Changes — `src/components/dock/schedule/DockNewBookingSheet.tsx`

1. **Import `useOrgNow`** and use `nowMinutes` to compute the nearest TIME_SLOT.

2. **Replace hardcoded `'09:00'`** (line 84) with a computed default:
   - Take `nowMinutes` from `useOrgNow()`, round up to the next 30-min boundary
   - Clamp to the TIME_SLOTS range (08:00–20:00)
   - Find the nearest matching slot string
   - Use that as the initial `selectedTime` value

3. **Also update the reset** (line 289) to use the same logic instead of `'09:00'`.

### Example logic
```typescript
const { nowMinutes } = useOrgNow();
const nearestSlotMinutes = Math.ceil(nowMinutes / 30) * 30;
const clamped = Math.max(8 * 60, Math.min(nearestSlotMinutes, 20 * 60));
const h = String(Math.floor(clamped / 60)).padStart(2, '0');
const m = String(clamped % 60).padStart(2, '0');
const defaultTime = `${h}:${m}`;
```

The initial state will use a function initializer (`useState(() => computeDefault())`) so it only runs once on mount but uses the current org time.

