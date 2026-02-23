

## Responsiveness Fix: Prevent Status Column Cutoff

### Problem
At medium viewport widths (~768-1024px), the table shows too many columns simultaneously: Date, Time, Client, Stylist, Status, and Price are all visible, causing the Status badges and Price to get clipped at the right edge.

### Solution
Aggressively shift column breakpoints so fewer columns compete for space at any given width. The priority cascade (most to least important):

| Column | Current | New | Rationale |
|--------|---------|-----|-----------|
| Date | Always | Always | Core identifier |
| Client | Always | Always | Core identifier |
| Stylist | Always | Always | Core identifier |
| Status | `md` (768px) | Always | Critical operational info, must never clip |
| Time | `sm` (640px) | `md` (768px) | Important but can be hidden on small screens |
| Price | `md` (768px) | `lg` (1024px) | Push out to make room for Status |
| Phone | `lg` (1024px) | `xl` (1280px) | Secondary info |
| Service | `lg` (1024px) | `xl` (1280px) | Secondary info |
| Email | `xl` (1280px) | `2xl` (1536px) | Tertiary info |
| Created | `xl` (1280px) | `2xl` (1536px) | Tertiary info |
| Created By | `2xl` (1536px) | Remove or keep `2xl` | Lowest priority |

Key change: **Status becomes always visible** (no `hidden` class) since it's operationally critical and the badges are compact. This means at the smallest screens you see: Date, Client, Stylist, Status -- all compact enough to fit.

### File Changed
**`src/components/dashboard/appointments-hub/AppointmentsList.tsx`**
- Update breakpoint classes on all 3 locations: TableHead headers, skeleton rows, and data rows
- Ensure `whitespace-nowrap` remains on Status and Price cells
- Reduce COL_COUNT awareness isn't affected (colSpan on empty state)

