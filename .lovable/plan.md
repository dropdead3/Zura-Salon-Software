

# Column Header + Non-Stylist Toggle

## Changes

**File:** `src/components/dashboard/settings/TeamCommissionRoster.tsx`

1. **Rename column header** — Change `<div>Stylist</div>` (line 235) to `<div>Team Member</div>`

2. **Add `hideNonStylists` toggle state** — New `useState<boolean>(false)` alongside existing filter state

3. **Add toggle UI** — Place a small switch/checkbox labeled "Hide non-stylists" in the filter bar area (near the location filter), using the existing `Checkbox` component or a `Switch`

4. **Filter logic** — In the `filteredTeam` memo, when `hideNonStylists` is true, additionally filter out members where `!member.roles?.includes('stylist')`

5. **Update empty state text** — Change "No active stylists found" (line 346) to "No team members found"

**1 file changed. No database changes.**

