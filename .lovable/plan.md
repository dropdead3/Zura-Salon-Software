

## Move and Restyle the Actual/Expected Toggle

### Current State
The Actual/Expected toggle (lines 1220-1239 in `AggregateSalesCard.tsx`) is a hand-rolled inline toggle sitting in the **left cluster** next to the "BY LOCATION" heading. It uses raw Tailwind classes instead of the tokenized `TogglePill` component.

### Changes

**Edit `src/components/dashboard/AggregateSalesCard.tsx`**

1. **Move the toggle from the left cluster to the right cluster** — relocate the `isToday && (...)` block from inside the left `div` (lines 1219-1240) into the right `div` (line 1242), placing it before the region filter.

2. **Replace the hand-rolled toggle with `TogglePill`** — swap the two raw `<button>` elements for:
   ```tsx
   <TogglePill
     options={[
       { value: 'actual', label: 'Actual' },
       { value: 'expected', label: 'Expected' },
     ]}
     value={locationRevenueView}
     onChange={(v) => setLocationRevenueView(v as 'actual' | 'expected')}
     size="sm"
     variant="solid"
   />
   ```

3. **Add import** for `TogglePill` from `@/components/ui/toggle-pill`.

### Files
- **Edit**: `src/components/dashboard/AggregateSalesCard.tsx`

