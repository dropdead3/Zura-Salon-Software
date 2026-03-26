

## Improve Allowance Calculator UX — DONE

All 8 improvements implemented in AllowanceCalculatorDialog.tsx.

## Reorder Drill-Down: Vessels Before Allowance + Vessel-Aware Calculator — DONE

### Changes Made

**ServiceTrackingSection.tsx**
- Moved vessel selector (Requires Color/Chemical toggle + Bowls/Bottles pills) above the allowance config block
- Gated "Configure Allowance" button on container_types having at least one entry
- Pass containerTypes to AllowanceCalculatorDialog
- Added calculatorContainerTypes state

**AllowanceCalculatorDialog.tsx**
- Added containerTypes prop (defaults to ['bowl'])
- Added vesselType field to BowlState interface
- Vessel-aware labels: "Bowl 1" vs "Bottle 1" based on type
- Vessel-aware icons: Beaker for bowls, TestTube2 for bottles
- Separate "Add Bowl" / "Add Bottle" buttons when both types are active
- Default initial vessel matches first selected container type
- Updated subtotals, footer, and save notes to use "vessel(s)" terminology
