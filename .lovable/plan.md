

# Zura Backroom Setup Wizard — Already Built

The setup wizard already exists and is fully functional at `src/components/dashboard/backroom-settings/BackroomSetupWizard.tsx` (729 lines). It includes:

1. **Welcome** — Overview of what gets configured
2. **Products** — Select products for backroom tracking, set cost-per-gram, grouped by category with bulk toggle
3. **Services** — Toggle services for tracking, map each to a primary product
4. **Allowances** — Set included quantity, unit, and overage rate per tracked service
5. **Station** — Create a mixing station with name and location assignment

**Already wired up:**
- The Overview page (`BackroomSetupOverview.tsx`) shows a "Launch Wizard" CTA when setup is incomplete
- Progress bar with step labels and animated slide transitions (framer-motion)
- Skip and Back navigation per step
- Each step saves data on advance (bulk product updates, service tracking components, allowance policies, station creation)
- Completion is persisted via `backroom_settings` with key `setup_wizard_completed`

**No changes are needed** — the wizard is fully implemented and accessible from the Backroom Settings Overview page. You can test it by navigating to the Overview tab and clicking "Launch Wizard."

If you'd like to **enhance** the existing wizard, here are some options:

| Enhancement | Description |
|---|---|
| **Recipe Baselines step** | Add a 6th step for defining recipe baselines (currently skipped) |
| **Bulk import** | Allow CSV upload of products/costs in the Products step |
| **Resume progress** | Save partial wizard state so users can resume later |
| **Validation gates** | Prevent advancing without minimum selections (e.g., at least 1 product) |
| **Smart defaults** | Pre-select products in common backroom categories (color, lightener, developer) |

