

## Redesign Service Tracking Section — Full Visibility + Configuration Progress

### Problem
The current UI splits services into fragmented cards (Tracked, Available, Suggested) and hides non-chemical services entirely. Admins can't see the full picture of all services or understand overall setup progress.

### Design

#### 1. Configuration Progress Bar (top of section)
A horizontal progress bar showing service tracking setup completeness across 4 milestones:
- **Services Classified** — % of services marked as chemical or non-chemical (`is_chemical_service` set intentionally)
- **Chemical Services Tracked** — % of chemical/suggested services with `is_backroom_tracked = true`
- **Components Mapped** — % of tracked services with at least one component in `service_tracking_components`
- **Allowances Set** — % of tracked services with an allowance policy

Display as a segmented progress bar with fraction labels (e.g., "8/12 tracked") and an overall percentage.

#### 2. Unified Service Table (replaces the 3 separate cards)
A single filterable table/list showing **all active services** with columns:
- **Status indicator** — color dot: green (tracked), amber (chemical but untracked), gray (non-chemical, not tracked)
- **Service Name**
- **Category**
- **Type badge** — "Chemical" / "Suggested" / "Standard" (non-chemical)
- **Tracking toggle** — Switch to enable/disable `is_backroom_tracked`
- **Config status** — icons/dots showing: has components, has allowance, has recipe baseline
- **Quick actions** — Components button, inline toggles for Asst. Prep / Mix Assist

#### 3. Filter Bar
Tabs or toggle chips above the table:
- **All** | **Tracked** | **Untracked** | **Needs Attention** (chemical but not tracked, or tracked but missing components/allowances) | **Uncategorized** (null category)

#### 4. Bulk Actions
- "Track All Chemical" button (existing logic, promoted to header)
- Multi-select checkbox for bulk enable/disable tracking

#### 5. Auto-Detect Banner (simplified)
Keep the existing suggested-services CTA but as a slim inline alert above the table rather than a separate card.

### Files Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx` — full rewrite of the render, add filter state, progress calculation, unified list
- May extract a new `ServiceTrackingProgressBar.tsx` component for the progress indicator

### Data Dependencies
All data already available — `services` query (has `is_chemical_service`, `is_backroom_tracked`, `category`), `useServiceTrackingComponents`, `useServiceAllowancePolicies`, `useBackroomSetupHealth`. No new tables or migrations needed.

