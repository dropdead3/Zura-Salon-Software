

## Redesign Dock Service Selection to Match Scheduling Wizard

### Problem
The Dock's "Choose Services" step shows a flat list with tiny category headers and duplicate services (same service name appearing multiple times from different branch variants). It feels unpolished compared to the dashboard's scheduling wizard which has clear category groupings, styled category headers, and deduped services.

### Changes

**1. Deduplicate services by name within each category**
In `DockNewBookingSheet.tsx` `ServiceStepDock`, before rendering, deduplicate services per category — keep the first occurrence per `name` (or the one with the longest duration). This eliminates the "Chunky Highlight" × 2, "Double Color Block" × 2, etc.

**2. Add category-first drill-down navigation (like Kiosk wizard)**
Replace the current flat list with a two-level view:
- **Level 1**: Category cards showing category name + service count, styled as tappable cards with a `Scissors` icon and service count
- **Level 2**: Tapping a category drills into its services list with a back-to-categories option

This matches the Kiosk's `selectedCategory` pattern and feels far more organized on mobile.

**3. Improve category header and service row styling**
- Category headers: styled band (like dashboard's `bg-muted` strip with uppercase tracking)
- Service rows: keep existing violet accent for selected state, but add the `Clock` icon for duration and proper currency formatting

**4. Add selected services summary chip bar**
At the bottom, above the Continue button, show selected service names as small chips (matching dashboard's `Badge variant="outline"` pattern) so users can see what they've picked.

### Files Changed

| File | Change |
|------|--------|
| `src/components/dock/schedule/DockNewBookingSheet.tsx` | Rewrite `ServiceStepDock` — add `selectedCategory` state, category card grid, drill-down service list, deduplication logic, improved styling, chip summary |

