

# Enhance Level Roadmap PDF Export

## Issues Found

The current PDF (`LevelRequirementsPDF.ts`) has several gaps:

1. **Missing KPIs in promotion table**: Only exports Revenue, Retail %, Rebooking %, Avg Ticket, and Tenure. Missing 4 KPIs that exist in the schema: Client Retention Rate, New Clients, Schedule Utilization, and Revenue Per Hour.
2. **Missing KPIs in retention table**: Same gap — Retention Rate, New Clients, Utilization, and Rev/Hour are in the schema but not exported.
3. **No organization logo**: The header shows org name as text only. The logo is available via `useBusinessSettings()` (`logo_light_url`) or `effectiveOrganization.logo_url`.
4. **No commission rates per level**: The PDF doesn't show Service/Retail commission percentages, which are a core part of the level architecture.
5. **No visual level progression**: No indication of the path from one level to the next.

## Plan

### File: `src/components/dashboard/settings/LevelRequirementsPDF.ts`

**A. Add logo support**
- Add `logoDataUrl?: string` to `LevelRequirementsPDFOptions` (base64 data URL, pre-fetched by caller)
- Render the logo in the dark header bar (left side, before title), sized to ~10mm height

**B. Add all missing KPIs to promotion criteria rows**
- Add Retention Rate, New Clients, Utilization, Rev/Hour to `formatCriteriaRow` requirements and weights arrays (same pattern as existing fields)

**C. Add all missing KPIs to retention criteria rows**
- Add Retention Rate, New Clients, Utilization, Rev/Hour to `formatRetentionRow` minimums array

**D. Add commission rates column**
- Add a "Commission" column to the promotion table showing Service/Retail rates per level
- Pass commission data through a new `commissions` field on the options interface

**E. Add a level progression visual**
- After the header stats, add a simple horizontal flow showing level names connected by arrows: `Emerging → Stylist → Senior → Master`

### File: `src/components/dashboard/settings/StylistLevelsEditor.tsx`

**F. Pass logo + commission data to PDF generator**
- Pre-fetch the org logo as a base64 data URL (canvas fetch + toDataURL) before calling `generateLevelRequirementsPDF`
- Pass `levels` commission rates alongside level info
- Pass the logo data URL

## Technical Details

- Logo fetching uses an `Image()` + canvas approach to convert the logo URL to a base64 data URL that jsPDF can embed. If the fetch fails (CORS, missing), the PDF generates without a logo — no blocking.
- Commission data is already available in the `levels` state array (`serviceCommissionRate`, `retailCommissionRate`).
- The progression visual uses simple `doc.text()` and `doc.line()` calls — no external dependencies.

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/settings/LevelRequirementsPDF.ts` | Add logo, missing KPIs, commission column, progression visual |
| `src/components/dashboard/settings/StylistLevelsEditor.tsx` | Pre-fetch logo, pass commission + logo data to PDF |

**2 files. No database changes.**

