

# Vish Screenshot Analysis — Feature Ideas for Zura Backroom

## What Vish Shows (across all 7 screenshots)

### 1. Insights Dashboard (Screenshot 1)
Top-level KPI cards: **Product Charges**, **Product Dispensed**, **Formulas Reweighed %**, **Percent Waste**, **Estimated Waste $**. These are salon-wide summary metrics for a date range.

### 2. Employee Performance Table (Screenshot 1)
Tabular report per stylist: Name, Services count, Product Dispensed ($ + grams), Product Per Service ($ + grams), % Reweighed, Waste Per Service, Product Charges. Exportable (cloud icon). Hidden fields toggle.

### 3. Service Report (Screenshot 2)
Same column structure but grouped by **service type** (Natural Root Retouch, Single Process Color, etc.) instead of employee. Shows which services consume the most product and waste.

### 4. Vish History Chart (Screenshot 2)
Time-series chart with Daily/Monthly/Yearly toggle showing Waste, Services Performed, Percent Waste, Product Dispensed, etc. overlaid.

### 5. Product Usage Report (Screenshot 3)
**Brand/manufacturer-level** breakdown: % of total usage, wholesale cost, retail price, waste, dispensed weight, number of services. Donut chart for brand share. Manufacturer comparison table.

### 6. Sales Log (Screenshot 6)
Transaction-level view with Client, Employee, Date, Status (color-coded badges), and Total. Shows product charges per appointment.

### 7. Configuration (Screenshot 7)
Container Weight Tolerance, Default Product Markup %, Automatic Logout, Syncing Mode — operational settings.

---

## What Zura Already Has
- Staff backroom performance metrics (useStaffBackroomPerformance)
- Service Intelligence with ServiceProfileTable (per-service usage, variance, cost)
- Stylist Mixing Dashboard with product trends and session history
- Compliance tracking (reweigh rates, manual overrides)
- Control Tower with exception inbox
- Backroom settings hub with product catalog, recipes, allowances
- True Profit model, predictive backroom, coaching signals

## Gap Analysis — High-Value Features to Add

### A. **Backroom Insights Dashboard** (HIGH — Vish's main screen)
Zura lacks a dedicated top-level "Backroom Insights" summary page with hero KPI cards. The data exists in hooks (`useStaffBackroomPerformance`, `useBackroomAnalytics`) but there's no consolidated view with:
- Total Product Charges (sum of all product costs billed)
- Total Product Dispensed (weight + cost)
- Formulas Reweighed % (salon-wide)
- Waste Rate % and Estimated Waste $
- Date range picker

**Implementation**: New page or tab within Backroom Settings using existing hooks. 5 summary cards + the employee performance table below.

### B. **Employee Performance Report Table** (HIGH)
A clean, sortable, exportable table showing per-stylist: Services, Product Dispensed ($+g), Product Per Service ($+g), % Reweighed, Waste Per Service, Product Charges. Zura has the raw data via `useBackroomStaffMetrics` and `useStaffBackroomPerformance` but no dedicated tabular report view matching this format.

**Implementation**: New component using existing hooks, add CSV/PDF export.

### C. **Product Usage by Brand/Manufacturer** (MEDIUM)
Vish shows brand-level aggregation with donut chart. Zura tracks products by brand in the catalog but doesn't aggregate usage metrics by brand. Would require joining `mix_bowl_lines` with `products` to group dispensed weight, cost, and waste by brand.

**Implementation**: New report component + query hook that groups mix_bowl_lines by product brand.

### D. **Backroom History Trend Chart** (MEDIUM)
Daily/Monthly time-series of waste, dispensed product, services — Vish's "History" chart. Zura has `ChemicalCostTrendCard` but it's limited. A richer multi-metric time-series with period toggle would be valuable.

**Implementation**: Extend existing trend data or create a new hook that buckets mix_session data by day/week/month.

### E. **Container Weight Tolerance Setting** (LOW)
Vish lets salons configure a tolerance threshold for container weights. Zura could add this to backroom_settings to filter out noise in reweigh data.

### F. **Default Product Markup %** (LOW)
Vish has a global markup setting. Zura could use this to auto-calculate retail pricing from wholesale cost in the product catalog.

---

## Recommended Priority

| Priority | Feature | Effort | Value |
|----------|---------|--------|-------|
| 1 | Backroom Insights Dashboard (KPI cards) | Medium | High — gives owners the at-a-glance view they expect |
| 2 | Employee Performance Report Table | Medium | High — direct Vish parity, exportable |
| 3 | Product Usage by Brand | Medium | Medium — unique operational insight |
| 4 | History Trend Chart | Low-Med | Medium — visual storytelling |
| 5 | Config: Weight Tolerance + Markup | Low | Low — nice-to-have settings |

These build on existing data infrastructure. No new database tables needed for items 1-2 (data already in `staff_backroom_performance`, `mix_sessions`, `mix_bowls`). Item 3 needs a new aggregation query. Items 4-5 are incremental.

