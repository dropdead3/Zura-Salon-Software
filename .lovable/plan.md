

## Fix: KPI Tile Icon Colors Violating Design Rules

The screenshot shows the Forecasting card's three KPI tiles with inconsistent icon colors. The `TrendingUp` (7-Day Total) correctly uses `text-primary`, but `Calendar` (Daily Operating Avg) uses `text-chart-2` (green) and `Users` (Appointments) uses `text-chart-3` (teal). Per the design token system, all KPI tile icons must use `text-primary`.

An audit of other dashboard KPI tile icons found the same violation in two additional components.

### Changes

**File 1: `src/components/dashboard/sales/ForecastingCard.tsx`**

- **Line 698**: `Calendar` icon — change `text-chart-2` to `text-primary`
- **Line 720**: `Users` icon — change `text-chart-3` to `text-primary`

**File 2: `src/components/dashboard/analytics/StaffUtilizationContent.tsx`**

- **Line 115**: `CheckCircle` icon — change `text-chart-2` to `text-primary`
- **Line 135**: `TrendingUp` icon — change `text-chart-3` to `text-primary`

**File 3: `src/components/dashboard/analytics/CapacityUtilizationSection.tsx`**

- **Line 271**: `Clock` icon — change `text-chart-3` to `text-primary`

### What stays the same

- Status-indicator colors (e.g., `text-destructive` on `XCircle` for no-shows, goal tracker pace colors) are intentional semantic signals and remain unchanged
- Chart data colors (`text-chart-*` on values, legends, badges) are data-visualization uses, not icon violations
- The `TrendingDown` icon in CapacityUtilization already correctly uses `text-muted-foreground` (contextual)

### Scope

5 class string changes across 3 files. No structural or logic changes.

