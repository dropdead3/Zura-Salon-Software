

## Billing Method Education & Selection UX

### What We're Building
A consultative comparison experience that helps salon owners understand the two product cost recovery methods before configuring per-service policies. This appears in two places: the Setup Wizard (as a new step) and at the top of the Allowances & Billing section.

### The Three Approaches (content)

| | Allowance | Parts & Labor | Hybrid |
|---|---|---|---|
| **How it works** | Product cost baked into service price. Overage charged if stylist uses more than budgeted. | Product cost itemized separately on receipt. Client pays labor + supplies as line items. | Core services use Allowance; add-ons/treatments use Parts & Labor. |
| **Client experience** | Clean, predictable pricing. No surprises unless overage. | Transparent but can feel itemized. Prices vary per visit. | Best of both — predictability for standard services, transparency for extras. |
| **Best for** | Salons with consistent product usage per service | Salons with highly variable product usage or specialty treatments | Most salons — the real-world default |
| **Risk** | Under-pricing if allowances aren't calibrated | Clients may push back on itemized charges | Slightly more setup work |
| **Pro tip** | Use Price Intelligence to set margins that account for your allowance budget | Set markup % in billing settings to ensure margin on every product used | Start with Allowance for your top 5 services, Parts & Labor for everything else |

### Component: `BillingMethodEducation`
A reusable card with:
- Three-column visual comparison (cards, not a raw table) with icons
- "Most salons use Hybrid" consultative callout
- Each card shows: icon, title, 2-line description, 3 bullet pros, 2 bullet cons, "Best for" tag
- No selection action — this is educational context. Per-service selection happens in the policy drill-down (already exists as the Parts & Labor toggle)

### Changes

**New file: `src/components/dashboard/backroom-settings/BillingMethodEducation.tsx`**
- Standalone presentational component rendering the three-method comparison
- Responsive: 3-col on desktop, stacked on mobile
- Uses existing Card, Badge components
- Consultative tone with "Most salons recommend" highlight on Hybrid

**File: `src/components/dashboard/backroom-settings/AllowancesBillingSection.tsx`**
- Import and render `<BillingMethodEducation />` above the existing Infotainer
- Collapsible via a "Learn about billing methods" disclosure so it doesn't permanently consume space after first read

**File: `src/components/dashboard/backroom-settings/BackroomSetupWizard.tsx`**
- Add a new step between Services (step 3) and Allowances (step 4): "Billing Strategy"
- Renders `<BillingMethodEducation />` with a brief intro: "Before setting allowances, here's how salons recover product costs"
- Update `STEP_COUNT` from 6 to 7 and shift step indexes
- Update `stepLabels` array

### Files

| File | Change |
|------|--------|
| `src/components/dashboard/backroom-settings/BillingMethodEducation.tsx` | New — comparison cards component |
| `src/components/dashboard/backroom-settings/AllowancesBillingSection.tsx` | Add collapsible education section at top |
| `src/components/dashboard/backroom-settings/BackroomSetupWizard.tsx` | Add "Billing Strategy" step (step 4), bump count to 7 |

