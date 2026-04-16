

# Responsive Stylist Headers — Three-Tier Adaptive Layout

## Problem
Currently there are only two modes (condensed < 120px, normal ≥ 120px). The user wants finer-grained responsiveness:
- **Wide**: Status dot with "Booking" label, top-right corner; full name
- **Medium**: Status dot only (no label), top-right; name switches to "First L." when too long
- **Narrow** (existing condensed): Vertical stack with "First L." name

## Changes — `src/components/dashboard/schedule/DayView.tsx`

### 1. Track column width as a number (not just boolean)
Replace `isCondensed` boolean with a numeric `columnWidth` state. Derive two thresholds:
- `isCondensed = columnWidth < 120` — vertical stack mode (existing)
- `isMedium = columnWidth >= 120 && columnWidth < 200` — horizontal but compact

### 2. Normal (wide ≥ 200px) layout
- Status dot + "Booking" label, positioned absolute top-right
- Full display name (e.g., "Lex Feddern")
- Utilization + level on second row as-is

### 3. Medium (120–200px) layout
- Status dot only (no label), absolute top-right
- Condensed name ("First L." format, e.g., "Lex F.")
- Utilization + level on second row

### 4. Condensed (< 120px) — no change
Keeps existing vertical stack with condensed name.

### Implementation detail

**ResizeObserver** — store `colWidth` in state instead of a boolean:
```tsx
const [columnWidth, setColumnWidth] = useState(200);
const isCondensed = columnWidth < 120;
const isMedium = columnWidth < 200;
```

**Status dot** — add "Booking" label conditionally:
```tsx
<span className={cn('w-2 h-2 rounded-full shrink-0', acceptingClients ? 'bg-emerald-500' : 'bg-destructive/70')} />
{!isMedium && (
  <span className="text-[10px] text-muted-foreground">
    {acceptingClients ? 'Booking' : 'Not Booking'}
  </span>
)}
```

**Name** — use condensed format when medium:
```tsx
<span className="text-xs font-medium leading-tight truncate">
  {isMedium ? condensedName : fullName}
</span>
```

**Status dot placement** — always absolute top-right in both normal and medium modes (currently inline in normal mode, needs to move to absolute).

Single file change, no new dependencies.

