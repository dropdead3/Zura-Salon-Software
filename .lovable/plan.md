

# Zura Capital — Conditional Surfacing + Access Restriction

## What Changes

1. **Sidebar visibility**: Zura Capital nav item only appears when there are active funding opportunities for the org AND the user is a super_admin or account owner (org admin). Not visible to managers, stylists, or any other role.

2. **Route protection**: Capital routes restricted to super_admin + org admin only (not just `view_team_overview` permission which is too broad).

3. **Remove stylist micro-funding**: Strip all stylist-level micro-financing UI and config since stylists are employees, not independent operators eligible for funding.

## Scope

### Sidebar (SidebarNavContent.tsx)
- Remove the static Capital nav item from `sectionItemsMap.ops` (line 152)
- Add a conditional Capital nav item that only renders when:
  - User is `super_admin` or org admin (from `useAuth` roles)
  - There are active `capital_funding_opportunities` for the org (query with count)
- Use a lightweight `useQuery` to check `capital_funding_opportunities` count where `status` is actionable

### Route Protection (App.tsx)
- Change Capital route guards from `requiredPermission="view_team_overview"` to `requireSuperAdmin` or a new check that includes org admins
- Since `requireSuperAdmin` only checks `is_super_admin` on profile, add a combined check: super_admin role OR org admin

### Remove Stylist Micro-Funding
- **CapitalSettings.tsx**: Remove the "Allow Stylist Micro-Funding" toggle, SPI threshold, and ORS threshold fields (lines 171–198)
- **capital-formulas-config.ts**: Remove `allowStylistMicrofunding`, `stylist_spi_threshold`, `stylist_ors_threshold` defaults and related reason codes
- **capital-formulas.ts**: Remove stylist micro-funding eligibility checks
- **stylist-financing-config.ts**: Remove `MICRO_FINANCING_USE_CASES` and related exports
- **useStylistFinancingEligibility.ts**: Delete hook
- **MicroFinancingOpportunities.tsx**: Delete component
- **financing-config.ts**: Remove `STYLIST_FINANCING_THRESHOLDS`
- **useDailyBriefingEngine.ts**: Remove stylist micro-funding references if any

### Files Summary

| File | Action |
|---|---|
| `src/components/dashboard/SidebarNavContent.tsx` | Conditional Capital nav — only for super_admin/org admin with active opportunities |
| `src/App.tsx` | Tighten Capital route guards |
| `src/pages/dashboard/admin/CapitalSettings.tsx` | Remove stylist micro-funding section |
| `src/config/capital-engine/stylist-financing-config.ts` | Remove `MICRO_FINANCING_USE_CASES` and related |
| `src/config/capital-engine/financing-config.ts` | Remove `STYLIST_FINANCING_THRESHOLDS` |
| `src/config/capital-engine/capital-formulas-config.ts` | Remove stylist micro-funding defaults + reason codes |
| `src/lib/capital-engine/capital-formulas.ts` | Remove stylist eligibility logic |
| `src/hooks/useStylistFinancingEligibility.ts` | DELETE |
| `src/components/dashboard/career/MicroFinancingOpportunities.tsx` | DELETE |
| `src/hooks/useDailyBriefingEngine.ts` | Clean up stylist capital references |
| `src/config/capital-engine/index.ts` | Remove `stylist-financing-config` re-export if only micro-financing used it |

## Technical Notes

- Sidebar will use a small query: `supabase.from('capital_funding_opportunities').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).in('status', ['pending_review', 'approved', 'ready'])` to determine if Capital should surface
- Career stage progression (Stylist → Owner) and SPI/ORS scoring remain intact — they're useful for career tracking. Only the micro-financing unlock layer is removed.
- The `StylistSPICard` and `CareerMilestoneTimeline` components stay (career visibility), but no longer gate financing

