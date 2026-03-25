

## Fix: Wire Demo Appointment Services to Demo Catalog

### Root Cause
Two issues prevent the Edit Services sheet from pre-selecting services in demo mode:

1. **Separator mismatch**: Demo appointment `service_name` fields use ` + ` as a separator (e.g., `"Full Balayage + Vivid Toner"`), but `DockAppointmentDetail.tsx` splits on `,` — so the whole string becomes one entry that doesn't match any single catalog item.

2. **Inconsistent separators**: One appointment (`demo-appt-11`) uses `, ` while all others use ` + `.

### Fix — 2 files

**1. `src/hooks/dock/dockDemoData.ts`**
- Standardize the separator to `, ` (comma-space) for ALL demo appointments' `service_name` — this matches how the detail view parses them (`.split(',').map(s => s.trim())`):
  - `'Full Balayage + Vivid Toner'` → `'Full Balayage, Vivid Toner'`
  - `'Natural Root Retouch + Glaze Add On'` → `'Natural Root Retouch, Glaze Add On'`
  - `'Full Highlight + Root Smudge (Add On) + Glaze Add On + Signature Haircut'` → `'Full Highlight, Root Smudge (Add On), Glaze Add On, Signature Haircut'`
  - Single-service appointments stay unchanged
- Update matching `service_name` references in `DEMO_FORMULA_HISTORY`, `DEMO_VISIT_HISTORY`, and `DEMO_FORMULA_MEMORY` for consistency

**2. `src/components/dock/appointment/DockAppointmentDetail.tsx`**
- No change needed — the existing `.split(',')` parsing already works once demo data uses comma separators

### Result
Opening Edit Services on any demo appointment will correctly pre-select the matching services from the demo catalog, allowing add/remove to work properly.

