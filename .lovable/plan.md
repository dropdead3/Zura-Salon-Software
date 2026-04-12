

# Capital Visibility Diagnostics — Control Tower Enhancement

## Problem

When an org owner contacts support asking "Why can't I see Zura Capital?", platform admins currently have no way to answer. The Control Tower only shows a toggle and "Active/Inactive" status — it doesn't reveal whether Capital is actually **surfacing** in the org's dashboard or **why not**.

The sidebar visibility logic (in `SidebarNavContent.tsx`) requires TWO conditions:
1. `capital_enabled` flag is ON
2. At least one opportunity exists with status `pending_review`, `approved`, or `ready`

Even when both are met, individual opportunities may fail internal eligibility checks (19 possible reason codes). Admins need to see all of this at a glance.

## What We're Building

An expandable **Visibility Diagnostics** row for each organization in the Control Tower table. When an admin clicks an org row, it expands to show:

### Diagnostic Checklist (per org)
A vertical checklist showing each gate in the visibility chain:

| Check | Status | Detail |
|---|---|---|
| Feature Flag | ✅ Enabled / ❌ Disabled | `capital_enabled` flag state |
| Qualifying Opportunities | ✅ 3 found / ⚠️ 0 qualifying | Count of opps with status in `pending_review, approved, ready` |
| Sidebar Visible | ✅ Yes / ❌ No | Both conditions above met |

### Opportunity Breakdown (if flag is ON)
A mini-table of all non-canceled/expired opportunities for that org:

| Opportunity | Status | Eligible | Top Blocker |
|---|---|---|---|
| Retail Expansion — Downtown | pending_review | ✅ | — |
| Chair Rental Upsell | detected | ❌ | ROE below threshold (1.2 vs 1.8 required) |
| Marketing Campaign Push | detected | ❌ | Confidence too low (45 vs 70 required) |

Each ineligible opportunity shows its **top reason code** mapped to the human-readable explanation from `EXPLANATION_TEMPLATES`.

### Summary Column (table-level)
Add a new "Visibility" column to the main org table showing a quick badge:
- **Surfacing** (green) — flag ON + qualifying opps exist
- **Enabled, Not Surfacing** (amber) — flag ON but no qualifying opps
- **Disabled** (gray) — flag OFF

This gives admins an instant answer without expanding.

## Technical Approach

### File: `src/pages/dashboard/platform/CapitalControlTower.tsx`

**Data fetching** — Extend `useOrganizationsWithCapital` to also fetch:
- Count of qualifying opportunities per org (status in `pending_review, approved, ready`)
- Total opportunity count per org (non-canceled/expired)

Add a new hook `useOrgCapitalDiagnostics(orgId)` that fetches on-demand (when a row is expanded):
- All opportunities for that org from `capital_funding_opportunities`
- Run `calculateInternalEligibility` client-side for each to get reason codes
- Return the checklist + opportunity breakdown

**UI changes:**
1. Add "Visibility" column to the main table with badge (Surfacing / Enabled, Not Surfacing / Disabled)
2. Make rows expandable — clicking reveals the diagnostic panel
3. Diagnostic panel contains the checklist + opportunity breakdown mini-table
4. Use existing `PlatformBadge` variants for status indicators

**Imports needed:**
- `calculateInternalEligibility`, `calculateRoeRatio`, `calculateOpportunityFreshnessDays`, `EXPLANATION_TEMPLATES` from capital-formulas
- `DEFAULT_CAPITAL_POLICY` from capital-formulas-config
- `ChevronDown`, `ChevronRight`, `Check`, `X`, `AlertTriangle` from lucide-react

### New file: `src/hooks/useOrgCapitalDiagnostics.ts`

On-demand hook that takes an `orgId` and returns:
- All opportunities with eligibility results
- Qualifying count
- Visibility verdict

Uses the same `calculateInternalEligibility` logic that the production sidebar uses, ensuring diagnostic output matches reality.

## Gaps & Enhancements Identified

1. **Policy overrides not visible** — If an org has custom policy settings (e.g., different ROE threshold), the diagnostics should show the effective policy values vs defaults so admins understand why thresholds differ.

2. **Dismissal/cooldown state not surfaced** — The sidebar check doesn't account for dismissals, but eligibility does. Diagnostics should show if cooldowns are active.

3. **No audit trail for flag changes** — Currently toggling capital_enabled doesn't log who changed it or when. The `organization_feature_flags` table has `updated_by` and `updated_at` but we should surface the last toggle timestamp per org.

4. **Missing "last opportunity detected" timestamp** — Admins should see when the system last generated an opportunity for an org, to distinguish "no data yet" from "evaluated and nothing qualified."

5. **No org-level health summary stat** — The top summary cards could add a 4th: "Surfacing" count (orgs where Capital is actually visible in sidebar).

## File Summary

| File | Change |
|---|---|
| `src/hooks/useOrgCapitalDiagnostics.ts` | New — on-demand diagnostic hook per org |
| `src/pages/dashboard/platform/CapitalControlTower.tsx` | Add Visibility column, expandable diagnostic rows, 4th summary card |

