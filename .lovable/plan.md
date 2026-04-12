

# Zura Capital — Gaps, Bugs, and Enhancements Audit

## Bugs / Issues Found

### 1. GrowthHub shows Zura Capital link without feature gate
**File:** `src/pages/dashboard/admin/GrowthHub.tsx` (line 72-77)

The Growth Hub hardcodes a "Zura Capital" card link for all users regardless of whether `capital_enabled` is toggled on. An org without Capital enabled sees this card, clicks it, and gets redirected away by the route gate — confusing UX. This card needs the same `capital_enabled` check.

### 2. CapitalProjects table has misaligned column count
**File:** `src/pages/dashboard/admin/CapitalProjects.tsx` (lines 61 vs 82)

The header grid declares 9 columns (`grid-cols-[1fr_100px_100px_80px_80px_80px_80px_90px_36px]`), but the row renders 9 cells including **3 separate CapitalStatusBadge calls** (status, activation_status, repayment_status) — the header only labels "Status" once at the end. The "Forecast" and "Activation" headers don't correspond to the rendered cells. The column mapping is mismatched: the header says "Forecast" and "Activation" but the row renders `CapitalStatusBadge` for project status, then activation, then repayment. This creates visual misalignment.

### 3. `stylist_id` references remain in Capital engine after stylist micro-funding removal
**Files:** `useZuraCapital.ts` (lines 52, 174-184, 258), `CapitalOpportunityDetail.tsx` (line 65 has `stylist_capacity_growth` execution plan)

The ZuraCapitalOpportunity interface still has `stylistId`, the hook still computes `stylistExposure`, and the eligibility inputs still include `stylistId`/`stylistExposure`. The opportunity detail page still has a `stylist_capacity_growth` execution plan template. These are dead code from the removed micro-funding layer and should be cleaned up to avoid confusion.

## Enhancements

### 4. No confirmation dialog before dismissing an opportunity
**File:** `src/pages/dashboard/admin/CapitalOpportunityDetail.tsx` (line 152)

`handleDismiss` fires immediately with no confirmation. A single misclick suppresses the opportunity for the cooldown period. Should add an AlertDialog.

### 5. No toast/feedback on settings save
**File:** `src/pages/dashboard/admin/CapitalSettings.tsx` (line 50)

`handleSave` calls `updateSettings.mutate(form)` but there's no success/error toast. The user clicks "Save Settings" and gets no confirmation that it worked.

### 6. "Linked Work" section is always empty
**File:** `src/pages/dashboard/admin/CapitalProjectDetail.tsx` (lines 144-156)

The "Linked Work" card always renders the empty state. There's no query or data hookup. This is a placeholder that should either be wired to task/campaign data or hidden until the feature is built (Phase 2+), to avoid showing a permanently empty section.

### 7. GrowthHub route permission is too broad
**File:** `src/App.tsx` (line 363)

The Growth Hub uses `view_team_overview` permission, but it contains the Capital link which should be admin-only. Since Capital is already separately gated, this isn't a security issue, but if Capital is the only meaningful item in GrowthHub for non-admins, they see a hub with cards they can't access.

## Recommended Scope (Implementation)

| # | File | Change |
|---|---|---|
| 1 | `GrowthHub.tsx` | Conditionally render the Zura Capital card only when `capital_enabled` flag is on |
| 2 | `CapitalProjects.tsx` | Fix column header/data alignment in the desktop table |
| 3 | `useZuraCapital.ts`, `CapitalOpportunityDetail.tsx` | Remove residual `stylistId`, `stylistExposure`, and `stylist_capacity_growth` references |
| 4 | `CapitalOpportunityDetail.tsx` | Add AlertDialog confirmation before dismiss |
| 5 | `CapitalSettings.tsx` | Add toast on save success/error |
| 6 | `CapitalProjectDetail.tsx` | Hide "Linked Work" section entirely until data exists (avoid permanent empty state) |

Items 1-5 are straightforward fixes. Item 6 is a UX cleanup. Item 7 is informational — no code change needed since Capital routes are independently gated.

