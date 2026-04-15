
Fix the scheduler so appointment cards use the actual service-category palette instead of the same fallback gray.

### What’s actually broken
The ghost styling is already being applied, but `AppointmentCardContent` is tinting cards from `appointment.service_category` only. When that value is missing, stale, or doesn’t match the configured category name exactly, `getCategoryColor()` falls back to the default gray — so every card ends up looking the same.

### Implementation
1. **Resolve a real display category before coloring**
   - In `src/components/dashboard/schedule/AppointmentCardContent.tsx`, add a resolved category value that prefers:
     1. the appointment’s stored category
     2. the primary service category from `serviceLookup`
     3. a last-resort service-name heuristic
   - Use this resolved category everywhere the card color is derived:
     - main card tint
     - accent border
     - consultation gradient detection
     - stored gradient marker lookup
     - block/break overlay checks
     - multi-service band colors

2. **Make fallback matching salon-aware**
   - In `src/utils/categoryColors.ts`, expand `getCategoryColor()` heuristics so common service names map correctly instead of defaulting to gray.
   - Add matches for common salon naming like:
     - `root retouch`, `single process`, `glaze`, `gloss`, `toner` → Color
     - `highlight`, `face frame`, `foils`, `balayage` → Blonding
     - `clipper`, `trim`, `haircut` → Haircuts
     - `blowout`, `style`, `updo` → Styling

3. **Ensure the scheduler uses service palette coloring**
   - In `src/pages/dashboard/Schedule.tsx`, stop relying on the legacy `preferences.color_by` value for the appointment cards and pass `service` coloring for day/week schedule cards so the scheduler consistently follows the configured service palette.
   - Keep status communication in the badge/pill, not the whole card fill.

### Result
- `Root Retouch` cards pick up the org’s Color color
- `Chunky Highlight / Face Frame Highlight` cards pick up Blonding color
- `Clipper`/cut services stop falling back to gray
- The existing ghost/frosted look stays, but each appointment is visibly tinted by its service category

### Technical details
- Files to update:
  - `src/components/dashboard/schedule/AppointmentCardContent.tsx`
  - `src/utils/categoryColors.ts`
  - `src/pages/dashboard/Schedule.tsx`
- No backend or database changes
- Shared `AppointmentCardContent` means day + week update together
