

## Reconfigure Progress Milestones for Current Architecture

### Problem
The progress bar shows 2 outdated milestones ("Classify & Track Services" and "Set Allowances") that no longer reflect the actual setup workflow. The build now has billing modes, recipe baselines, and product pricing as distinct configuration steps.

### New Milestones (4 steps)

| # | Label | Numerator | Denominator | Tooltip |
|---|-------|-----------|-------------|---------|
| 1 | **Track Services** | Services with `is_backroom_tracked === true` | Services where `getServiceType` returns `chemical` or `suggested` | "Enable tracking for services that use color or chemical products." |
| 2 | **Set Billing Mode** | Tracked services that have an allowance policy (any `billing_mode`) | All tracked services | "Choose Allowance or Parts & Labor billing for each tracked service." |
| 3 | **Build Recipes** | Tracked services with `billing_mode === 'allowance'` AND `policy.is_active === true` AND `policy.notes` contains a dollar value (recipe saved) | Tracked services with `billing_mode === 'allowance'` (or no policy yet, defaulting to allowance) | "Define product recipes and quantities for allowance-based services." |
| 4 | **Configure Pricing** | Tracked services with `billing_mode === 'parts_and_labor'` that have `is_active === true` on their policy, PLUS allowance services already counted in step 3 | All tracked services | "Confirm pricing rules are set — allowance amounts or pass-through markup." |

**Simplification**: After review, steps 3 and 4 overlap too much. Better approach with 3 clean milestones:

| # | Label | Current | Total | Tooltip |
|---|-------|---------|-------|---------|
| 1 | **Track Services** | Tracked services count | Chemical + suggested services count | "Enable color bar tracking for services that use color or chemical products." |
| 2 | **Set Billing Method** | Tracked services with an allowance policy record | All tracked services | "Choose how each service is billed — Allowance (recipe-based) or Parts & Labor (cost pass-through)." |
| 3 | **Configure Allowances** | Tracked services where the policy `is_active === true` (recipe saved for allowance mode, or auto-active for P&L) | All tracked services | "Build recipes for allowance services or confirm pass-through settings for Parts & Labor services." |

### File: `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`

**Lines 338–359** — Replace the `milestones` useMemo with the 3 new milestones using existing `allServices`, `allowanceByService`, and `getServiceType` data (no new queries needed).

### File: `src/components/dashboard/color-bar-settings/ServiceTrackingProgressBar.tsx`

No changes needed — it already renders any number of milestones dynamically.

### Result
Progress bar reflects the actual 3-step workflow: Track → Choose Billing Method → Configure. Each step has clear completion criteria tied to real data.

