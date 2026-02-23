

## Responsive Table Columns

The table currently shows all 11 columns at every screen size. We will add Tailwind responsive `hidden` classes so columns progressively hide as the viewport shrinks, while keeping all data in the CSV export and detail drawer.

### Column Visibility Tiers

| Breakpoint | Visible Columns |
|-----------|----------------|
| xl (1280px+) | All 11 columns |
| lg (1024-1279px) | Drop: Created By |
| md (768-1023px) | Drop: Created, Email |
| sm (640-767px) | Drop: Phone, Price, Status |
| < 640px | Date, Client, Stylist only |

### Priority Map

| Column | Always visible? | Hidden below |
|--------|----------------|-------------|
| Date | Yes | Never |
| Time | No | sm (< 640px) |
| Client | Yes | Never |
| Phone | No | md (< 768px) |
| Email | No | lg (< 1024px) |
| Service | No | sm (< 640px) |
| Stylist | Yes | Never |
| Status | No | md (< 768px) |
| Price | No | md (< 768px) |
| Created | No | lg (< 1024px) |
| Created By | No | xl (< 1280px) |

At the smallest viewport (below 640px): Date, Client, Stylist remain -- matching the requirement. At 640px+ Time and Service come back. At 768px+ Phone, Status, Price return. At 1024px+ Email and Created appear. At 1280px+ Created By shows.

### Technical Detail

**File: `src/components/dashboard/appointments-hub/AppointmentsList.tsx`**

Add matching `hidden` + responsive `table-cell` classes to both `TableHead` and `TableCell` for each column tier:

- `hidden xl:table-cell` for Created By
- `hidden lg:table-cell` for Email, Created
- `hidden md:table-cell` for Phone, Status, Price
- `hidden sm:table-cell` for Time, Service

The skeleton loading rows will also respect these classes by applying them to each skeleton cell. The `COL_COUNT` for `colSpan` on the empty state remains 11 (it just spans whatever is visible).

No changes to data fetching, CSV export, or the detail drawer -- all data remains accessible, just visually hidden at smaller widths.
