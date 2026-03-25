

## Fix: Align Demo Appointment Service Names with Demo Service Catalog

### Root Cause
Demo appointments use invented service names (e.g., "Balayage + Toner", "Root Touch-Up + Gloss", "Color Correction", "Toner Refresh", "Vivids (Fashion Color)") that don't exist in `DEMO_SERVICES`. The Edit Services sheet matches by exact name against the catalog — so nothing pre-selects.

### Fix — `src/hooks/dock/dockDemoData.ts`

Update `DEMO_APPOINTMENTS` service names to use exact names from `DEMO_SERVICES`, joined with ` + ` for multi-service appointments:

| Appointment | Current `service_name` | New `service_name` |
|---|---|---|
| demo-appt-1 (Sarah Mitchell) | `Balayage + Toner` | `Full Balayage + Vivid Toner` |
| demo-appt-7 (Rachel Kim) | `Root Touch-Up + Gloss` | `Natural Root Retouch + Glaze Add On` |
| demo-appt-2 (Jessica Chen) | `Root Touch-Up + Gloss` | `Natural Root Retouch + Glaze Add On` |
| demo-appt-3 (Emily Rodriguez) | `Full Highlight + Root Smudge + Glaze Add On + Signature Haircut` | `Full Highlight + Root Smudge (Add On) + Glaze Add On + Signature Haircut` |
| demo-appt-4 (Amanda Park) | `Color Correction` | `Corrective Color - By The Hour` |
| demo-appt-5 (Lauren Taylor) | `Toner Refresh` | `Vivid Toner` |
| demo-appt-6 (Maria Gonzalez) | `Vivids (Fashion Color)` | `Full Vivid` |

Non-chemical appointments (Signature Haircut, Blowout, etc.) already match the catalog — no changes needed.

### Also update related demo data references
- `DEMO_FORMULA_HISTORY` and `DEMO_FORMULA_MEMORY` entries that reference old service names (e.g., "Root Touch-Up + Gloss") need to be updated to match the new names so formula memory continues to resolve correctly.
- `DEMO_VISIT_HISTORY` entries referencing old names should also be updated for consistency.

### Summary — 1 file changed
`src/hooks/dock/dockDemoData.ts` — realign all demo service names to match the catalog exactly.

