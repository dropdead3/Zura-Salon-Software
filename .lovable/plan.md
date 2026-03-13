

# Further Simplification: Smart Defaults, Nav Badges, and Guided Flow

## What's Already Done
- Setup Wizard (5 steps), Infotainers on all 12 sections, field-level tooltips, empty state guidance, setup health dashboard.

## What's Still Missing

### 1. Sidebar Nav Completion Badges
The left nav shows 12 sections with no indication of which are configured and which need attention. Users don't know where to go next.

**Change:** Add completion status indicators (green dot, yellow dot, or nothing) next to each sidebar item in `BackroomSettings.tsx`. Use the existing `useBackroomSetupHealth` data to determine status per section.

### 2. Prerequisite Locking with Inline Guidance
Sections like Recipe Baselines, Allowances, and Service Tracking are useless if prerequisites aren't met (no products tracked, no services mapped). Currently they show an empty state, but users can still click into them and get confused.

**Change:** In the sidebar, show a lock icon and subtle "(requires Products)" text for sections that can't be configured yet. When clicked, show a clear prereq banner at top: "Complete [Products & Supplies] first, then come back here" with a direct link button.

### 3. "Quick Start Templates" for Alerts
The Alerts section requires users to know what rules to create. Most salons need the same 3-4 rules.

**Change:** Add a "Use Recommended Rules" button in `AlertsExceptionsSection.tsx` that one-click creates:
- Missing reweigh (warning)
- Excess usage >25% (warning, creates exception)
- Low stock (info, creates task)
- No mix session for color appointment (warning, creates exception)

### 4. Auto-Detect Color Services
When users arrive at Service Tracking, they have to manually toggle each color/chemical service. We already have `isColorOrChemicalService()` — use it to pre-suggest which services to track.

**Change:** Add a "Auto-detect color services" button in `ServiceTrackingSection.tsx` that highlights services matching the color/chemical pattern with a "Suggested" badge, and offers a "Track All Suggested" bulk action.

### 5. Post-Save "Next Step" Toast
After saving in any section, users don't know what to do next. The flow is: Products → Services → Baselines → Allowances → Stations → Alerts.

**Change:** After a successful save in each section, show a toast with a "Next: [Section Name] →" action button that navigates to the next logical section. Requires passing the `onNavigate` callback (or using a shared context/callback) to each section component.

### 6. Section Descriptions in Sidebar
The sidebar labels alone ("Recipe Baselines", "Allowances & Billing") don't tell users what they are.

**Change:** On hover, show a tooltip with a one-line description for each sidebar item using the existing `Tooltip` component. Example: "Recipe Baselines — Expected product quantities per service."

## Files to Modify

| File | Changes |
|------|---------|
| `BackroomSettings.tsx` | Add completion dots + lock icons to sidebar nav, hover tooltips on nav items, pass `onNavigate` to all section components |
| `AlertsExceptionsSection.tsx` | Add "Use Recommended Rules" quick-start button |
| `ServiceTrackingSection.tsx` | Add "Auto-detect color services" button with bulk-track action |
| `BackroomProductCatalogSection.tsx` | Add post-save "Next: Services →" toast |
| `ServiceTrackingSection.tsx` | Add post-save "Next: Recipe Baselines →" toast |
| `RecipeBaselineSection.tsx` | Add post-save "Next: Allowances →" toast |
| `AllowancesBillingSection.tsx` | Add post-save "Next: Stations →" toast |
| `StationsHardwareSection.tsx` | Add post-save "Next: Alerts →" toast |

## Scope
6 enhancements, ~8 files modified. All use existing components (Tooltip, Badge, toast). No new database tables or hooks needed — just UI guidance improvements using data already available from `useBackroomSetupHealth`.

