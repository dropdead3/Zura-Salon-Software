

# Add "Zura Color Room" Analytics Section to Staff 1:1 Report

## Problem
The Color Bar Compliance section (lines 692-774) is conditionally hidden when `totalColorAppointments === 0` from both the primary hook and compliance summary hook. Since neither data source is detecting color appointments for this staff member, the entire section disappears — leaving coaches with no Color Room visibility during 1:1 prep.

## Changes

### File: `src/components/dashboard/reports/IndividualStaffReport.tsx`

1. **Rebrand section** — Rename "Color Bar Compliance" to "Zura Color Room" with a `Beaker` icon (replacing `ShieldCheck`)

2. **Always render the section** — Remove the conditional gate (`totalColorAppointments > 0`). The section always appears after Retail Performance. When no data exists, show an empty state: *"No color or chemical services tracked during this period. Data will populate once appointments are processed through Zura Color Room."*

3. **Restructure layout** — Organize into two visual rows:
   - **Row 1 — Compliance**: Compliance Rate (with team avg), Color Appointments, Tracked, Missed
   - **Row 2 — Operations**: Waste Rate %, Waste Cost $, Reweigh Rate %, Overage Attachment %, Overage Charges $

4. **Update PDF export** — Ensure the "Zura Color Room" section name is reflected in the PDF table headers

### Files Changed
| File | Change |
|---|---|
| `src/components/dashboard/reports/IndividualStaffReport.tsx` | Rebrand to "Zura Color Room", remove visibility gate, add empty state |

1 file modified. No database changes.

