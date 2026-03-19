

# Fix Logo Distortion, Org Name, and Report Title

## Problems
1. **Logo distorted**: `addImage` forces the logo into a fixed 40×14mm box, stretching it. No aspect-ratio preservation.
2. **Org name shows "Organization"**: All reports use `effectiveOrganization?.name` which is null/empty. Should use `businessSettings?.business_name` ("Drop Dead Salons").
3. **Report title**: StockTab still says "Inventory Stock Report" — should be "Backroom Stock Report".

## Changes

### 1. `src/lib/reportPdfLayout.ts` — Fix logo sizing and layout

**Logo rendering** (lines 121-138): Instead of forcing the logo into `LOGO_MAX_WIDTH × LOGO_MAX_HEIGHT`, load it into an `Image()` to get natural dimensions, compute aspect-ratio-preserving dimensions within the max bounds, then call `addImage` with the correct width/height. Position the logo **above** the org name (top-left), not beside it.

**Layout change**: Logo sits at top-left corner, small. Org name, location, and title render below the logo (not beside it). Adjust Y offsets accordingly.

```text
BEFORE:                          AFTER:
[LOGO stretched]  Org Name       [small logo, correct ratio]
                  Location       Org Name
                  Title          Location
                                 Title
```

### 2. `StockTab.tsx` — Fix org name + title

- **Line 78**: Change `'Inventory Stock Report'` → `'Backroom Stock Report'`
- **Line 313**: Change `effectiveOrganization?.name ?? 'Organization'` → `businessSettings?.business_name || effectiveOrganization?.name || 'Organization'`

### 3. All 13 report generators — Fix org name

Change `effectiveOrganization?.name ?? 'Organization'` → `businessSettings?.business_name || effectiveOrganization?.name || 'Organization'` in every file that sets `orgName` in header opts:

`ExecutiveSummaryReport`, `FinancialReportGenerator`, `SalesReportGenerator`, `StaffKPIReport`, `CapacityReport`, `RetailProductReport`, `NoShowReport`, `IndividualStaffReport`, `RetailStaffReport`, `PayrollSummaryReport`, `EndOfMonthReport`, `ClientRetentionReport`, `CountsTab`, `ReportPreviewModal`.

### 4. `ReportPreviewModal.tsx` — Fix org name in preview

Line 39: Same pattern — prefer `businessSettings?.business_name`.

### Technical Detail — Aspect-ratio logo fix in `addReportHeader`

```ts
// Load image to get natural dimensions
const img = new Image();
img.src = opts.logoDataUrl;
await new Promise(r => { img.onload = r; img.onerror = r; });
const natW = img.naturalWidth || 1;
const natH = img.naturalHeight || 1;
const scale = Math.min(LOGO_MAX_WIDTH / natW, LOGO_MAX_HEIGHT / natH, 1);
const logoW = natW * scale;
const logoH = natH * scale;
doc.addImage(opts.logoDataUrl, format, marginLeft, HEADER_TOP, logoW, logoH);
```

Since `addReportHeader` is synchronous, we'll pre-compute logo dimensions in `fetchLogoAsDataUrl` and return them alongside the data URL, or make the header function accept pre-computed dimensions. Simplest: return `{ dataUrl, width, height }` from `fetchLogoAsDataUrl` and update the interface.

