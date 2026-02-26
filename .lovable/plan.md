

## Add Expected/Actual toggle to the By Location section

**File: `src/components/dashboard/AggregateSalesCard.tsx`**

### 1. Add state for the toggle (near other location state declarations ~line 270s)

```tsx
const [locationRevenueView, setLocationRevenueView] = useState<'expected' | 'actual'>('actual');
```

Only relevant when `isToday` is true.

### 2. Add toggle button group in the By Location header (lines 1219-1254)

Insert a small two-option toggle (styled as pill tabs, matching existing filter patterns) between the "BY LOCATION" title and the sort controls. Only visible when `isToday` is true:

```tsx
{isToday && (
  <div className="flex items-center bg-muted/50 rounded-full p-0.5 text-xs">
    <button
      className={cn(
        'px-3 py-1 rounded-full transition-colors',
        locationRevenueView === 'actual' && 'bg-background shadow-sm text-foreground',
        locationRevenueView !== 'actual' && 'text-muted-foreground'
      )}
      onClick={() => setLocationRevenueView('actual')}
    >
      Actual
    </button>
    <button
      className={cn(
        'px-3 py-1 rounded-full transition-colors',
        locationRevenueView === 'expected' && 'bg-background shadow-sm text-foreground',
        locationRevenueView !== 'expected' && 'text-muted-foreground'
      )}
      onClick={() => setLocationRevenueView('expected')}
    >
      Expected
    </button>
  </div>
)}
```

### 3. Update collapsed row revenue display (lines 1289-1300)

Replace the current logic that auto-selects actual when available. Instead, use the toggle state:

- `locationRevenueView === 'actual'`: show `locationActuals[id]?.actualRevenue ?? 0` (0 if no POS data yet)
- `locationRevenueView === 'expected'`: show `location.totalRevenue` (appointment-based)
- When not today: show `location.totalRevenue` as before

### 4. Update expanded detail metrics (lines 1330-1382)

When `isToday && locationRevenueView === 'actual'`, the Services, Products, Transactions, and Avg Ticket sub-tiles should show actual POS values from `locationActuals` (or 0 if no data). When `expected`, show the existing appointment-based `location.*` values. Non-today ranges remain unchanged.

### Files changed
- `src/components/dashboard/AggregateSalesCard.tsx` — 1 new state variable, toggle UI in header, updated value logic in collapsed row and expanded detail tiles

