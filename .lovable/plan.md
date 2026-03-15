

# Improvements from Vish Screenshots — Service Allowance & Tracking

Based on the Vish screenshots and a review of the existing code, here are the concrete improvements to make:

## Issues Found

### 1. Allowance policies show raw `service_id` instead of service name (BUG)
Line 135 of `AllowancesBillingSection.tsx` shows `policy.service_id.slice(0, 8)…` — users see a UUID fragment instead of the actual service name. This is a clear UX bug.

**Fix**: Join with the services table (or fetch services separately) and display the service name.

### 2. No allowance summary badges on the Service Tracking list
In Vish, each service in the menu shows an inline summary like "30g color + 45g developer". Zura's tracked service rows show toggle switches but no indication of whether an allowance policy exists or what it contains.

**Fix**: In `ServiceTrackingSection.tsx`, cross-reference allowance policies and show a small badge like `30g included · $0.50/g overage` on each tracked service row. If no policy exists, show a subtle "No allowance set" chip.

### 3. No quick-set weight presets in the allowance builder
Vish uses preset buttons (15g, 30g, 60g) and developer ratio toggles (1x, 1.5x, 2x) for fast configuration. Zura's bucket form only has a plain number input.

**Fix**: Add preset weight buttons above the included quantity input in the bucket form, and a developer ratio selector that auto-calculates developer quantity from the color quantity.

### 4. No "Parts & Labor" billing mode toggle
Vish allows toggling individual services between "fixed allowance" and "parts & labor" (pass-through cost). Zura doesn't have this concept.

**Fix**: Add a `billing_mode` field to service allowance policies (`'allowance' | 'parts_and_labor'`) with a toggle in the UI. When set to parts & labor, the allowance fields are hidden and the full product cost is passed through.

## Plan

### A. Fix service name display in AllowancesBillingSection (quick fix)
- Fetch services list alongside policies
- Replace `policy.service_id.slice(0,8)…` with the actual service name

### B. Add allowance summary badges to ServiceTrackingSection
- Import `useServiceAllowancePolicies` in ServiceTrackingSection
- For each tracked service row, find matching policy and render an inline badge showing included qty + overage rate
- Show "No allowance" in muted text if none exists, with a link to the Allowances section

### C. Add weight preset buttons to bucket form
- Add a row of preset buttons (15g, 30g, 45g, 60g, 90g) that populate the included_quantity field
- Add a "Developer Ratio" selector (1x, 1.5x, 2x) that shows calculated developer weight based on color weight
- These are UI conveniences only — they set the same underlying fields

### D. Add billing mode toggle (requires DB migration)
- Add `billing_mode` column to `service_allowance_policies` table (default `'allowance'`)
- Add toggle in AllowancesBillingSection policy view
- When `parts_and_labor`, hide allowance qty/overage fields and show explanation text

### Files changed
- `src/components/dashboard/backroom-settings/AllowancesBillingSection.tsx` — service name lookup, preset buttons, billing mode toggle
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx` — allowance summary badges
- DB migration: add `billing_mode` column to `service_allowance_policies`

