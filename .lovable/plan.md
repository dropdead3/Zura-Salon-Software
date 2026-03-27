

## Surface Allowance / Parts & Labor Status in Service List

### What Changes
Add a **Product Allowance** column to the service tracking table that displays:
- **Dollar amount** (e.g., `$20.04`) with a calculator icon for services with an allowance policy
- **"Parts and Labor"** badge (blue, like the Vish screenshot) for services using P&L billing mode
- **Empty** for untracked or unconfigured services

### File: `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`

**1. Add a new `TableHead` column** between "Service" and "Tracked" (after line 633):
- Label: `Product Allowance`
- Uses `tokens.table.columnHeader`
- Add a `MetricInfoTooltip` explaining what this column shows

**2. Add a new `TableCell` in each service row** (between the service name cell and the tracking toggle cell, around line 736):
- Look up the policy from `allowanceByService.get(service.id)`
- If `billing_mode === 'parts_and_labor'` → render a blue `Badge` reading "Parts and Labor"
- If `billing_mode === 'allowance'` and policy exists → parse the dollar amount from `policy.notes` (format: `"Recipe-based: $20.04 product allowance..."`) using a regex like `/\$(\d+\.\d{2})/`, display with a calculator icon
- If no policy → render nothing

**3. Update the `colSpan` on the expanded detail row** from `4` to `5` (line 783)

**4. Add a helper function** to extract the dollar amount:
```ts
function extractAllowanceDollar(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/\$(\d+\.?\d*)/);
  return match ? `$${match[1]}` : null;
}
```

### Visual Result
Matches the Vish reference: services show their allowance dollar value inline, or a "Parts and Labor" badge — giving operators instant visibility into billing configuration without expanding each row.

