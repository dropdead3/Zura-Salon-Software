

# Make Every Backroom Settings Section Self-Explanatory

## Problem
Each section in the left nav drops you into a functional UI with no context — no explanation of what the section does, why it matters, how to use it, or what order to set things up. Labels like "Depletion Method," "Component Role," "Allowance Bucket," and "Variance Threshold" are jargon with no tooltips. The existing `Infotainer` and `MetricInfoTooltip` components are available but unused across 10 of 12 sections.

## Approach
Add three layers of guidance to every section:

### Layer 1: Section Infotainer (dismissible banner at top of each section)
Add an `Infotainer` component at the top of each section with:
- **What** this section configures
- **Why** it matters (business impact)
- **When** to set it up (prerequisite order)
- **How** to get started (first action to take)

Each Infotainer gets a unique `id` so dismissal persists per-user.

| Section | Infotainer summary |
|---------|-------------------|
| Products & Supplies | "Choose which products stylists use at the mixing station. Toggle tracking on, set costs, and pick how each product is measured (weighed, pumped, etc). Do this first — services can't be tracked without products." |
| Service Tracking | "Link your services (e.g. Balayage, Root Touch-Up) to the products they consume. This tells Zura which products to expect when a stylist mixes for that service. Requires products to be tracked first." |
| Recipe Baselines | "Set the expected product quantities per service — e.g. 'A full highlight uses ~30g lightener + 60ml developer.' Powers Smart Mix Assist suggestions and flags when a stylist uses significantly more or less than expected." |
| Allowances & Billing | "Define how much product is included in each service price and what to charge when a stylist uses more. Example: 30g of color included, $0.50/g overage. Requires services to be tracked first." |
| Stations & Hardware | "Register your physical mixing stations and optionally pair Bluetooth scales. Each station is tied to a location so Zura knows where mixing happens." |
| Inventory | "Control how Zura monitors stock levels, triggers reorder alerts, and forecasts demand based on upcoming appointments." |
| Permissions | "Decide who can do what in Backroom — from mixing bowls to viewing costs to overriding charges. Each column is a role, each row is a capability." |
| Alerts & Exceptions | "Set up automatic alerts for operational issues — like a stylist skipping the reweigh step, using 50% more product than expected, or running low on stock." |
| Formula Assistance | "Smart Mix Assist suggests formulas based on client history and recipe baselines. Configure the suggestion priority, auto-populate behavior, and the disclaimer shown to staff." |
| Compliance | "Track whether color/chemical appointments are being properly logged. Shows which stylists are weighing their bowls and which are skipping steps." |
| Multi-Location | "View and manage setting differences between locations. Copy settings from one location to another or compare side-by-side." |

### Layer 2: Field-level MetricInfoTooltips
Add `MetricInfoTooltip` (the existing `(i)` icon) next to every non-obvious label, control, and column header across all sections. Key examples:

**Products & Supplies:**
- "Tracked" toggle → "When on, this product appears in the mixing dashboard and its usage is recorded per appointment."
- "Depletion Method" → "How this product is measured when used. 'Weighed' uses a scale; 'Per Pump' counts pumps dispensed."
- "Billable" → "When on, overage usage of this product can be charged to the client."
- "Overage" → "When on, usage beyond the service allowance triggers an overage charge."
- "No cost" badge → "This product has no unit cost set. Add a cost so Zura can calculate margins and overage charges."

**Service Tracking:**
- "Asst. Prep" → "Allows assistants to pre-mix bowls for this service before the stylist arrives."
- "Mix Assist" → "Enables AI-powered formula suggestions when mixing for this service."
- "Components" button → "Map which tracked products are consumed during this service."
- Component "Role" dropdown → "Required = always used. Optional = sometimes used. Conditional = depends on technique."

**Recipe Baselines:**
- Card description → "The expected amount of each product for a standard application. Zura flags deviations beyond the variance threshold."

**Allowances & Billing:**
- "Included Qty" → "Amount of product included in the service price at no extra charge."
- "Overage Rate" → "Price charged per unit when usage exceeds the included quantity."
- "Overage Cap" → "Maximum overage charge per service, regardless of how much extra was used."
- "Rounding Rule" → "How fractional overage amounts are rounded for billing."
- "Manager Override Required" → "When on, a manager must approve the overage charge before it's applied."
- "Bucket" → "Separate billing tiers within one policy — e.g. one bucket for color, another for lightener."

**Stations & Hardware:**
- "Device ID" → "Identifier for the tablet or device at this station (e.g. 'tablet-001')."
- "Scale ID" → "Identifier for the Bluetooth scale paired to this station."
- Health dot → "Green = seen in last hour. Yellow = seen in last 24h. Red = offline for 24h+."

**Permissions:**
- Each permission row label gets a tooltip explaining what it controls

**Alerts & Exceptions:**
- "Creates Exception" → "Logs an exception report that managers can review in the Control Tower."
- "Creates Task" → "Automatically creates an operational task assigned to the relevant manager."
- "Threshold Value" → "The numeric trigger point. For 'Missing Reweigh' use count; for 'Excess Usage' use percentage."

**Inventory:**
- "Reorder Cycle" → "How often Zura checks if any products need reordering."
- "Lead Time" → "Expected days between placing an order and receiving delivery."
- "Forecast Participation" → "Uses upcoming appointment data to predict demand and adjust reorder quantities."

### Layer 3: Empty-state guidance upgrades
Enhance existing empty states with clearer next-step CTAs:

- **Products (no tracked):** Add a "Start by toggling on your most-used color products" hint
- **Services (no tracked):** "Go to Products & Supplies first to track products, then come back here"
- **Recipe Baselines (no services):** Show prerequisite chain: "Products → Services → then Baselines"
- **Allowances (no policies):** "Allowances are created per tracked service. Track services first, then define billing rules here."
- **Alerts (no rules):** Add a "Recommended Rules" quick-start button that pre-creates 3 common rules (missing reweigh, excess usage >20%, low stock)

## Files to modify

| File | Changes |
|------|---------|
| `BackroomProductCatalogSection.tsx` | Add Infotainer + tooltips on toggle, depletion, billable, overage, "no cost" |
| `ServiceTrackingSection.tsx` | Add Infotainer + tooltips on Asst. Prep, Mix Assist, Components, component roles |
| `RecipeBaselineSection.tsx` | Add Infotainer + tooltip on baseline dialog |
| `AllowancesBillingSection.tsx` | Add Infotainer + tooltips on every billing field |
| `StationsHardwareSection.tsx` | Add Infotainer + tooltips on device/scale IDs, health dot |
| `InventoryReplenishmentSection.tsx` | Add Infotainer + tooltips on reorder cycle, lead time, forecast |
| `BackroomPermissionsSection.tsx` | Add Infotainer + tooltip on each permission label |
| `AlertsExceptionsSection.tsx` | Add Infotainer + tooltips on creates exception/task, threshold + recommended rules CTA |
| `FormulaAssistanceSection.tsx` | Add Infotainer + tooltips on ratio lock, hierarchy, auto-populate |
| `BackroomComplianceSection.tsx` | Add Infotainer (already has MetricInfoTooltips) |
| `MultiLocationSection.tsx` | Add Infotainer + tooltips on override/copy/compare |
| `BackroomSetupOverview.tsx` | Add Infotainer explaining the overview purpose |

All 12 sections touched. No new components needed — uses existing `Infotainer` and `MetricInfoTooltip`.

