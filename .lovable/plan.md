## Problem

The Customize menu lists toggles, but several have no matching render branch in `DashboardHome.tsx`, and one (Payday Countdown) silently self-suppresses with no operator-visible reason. Result: toggle is ON, nothing appears, no explanation.

## Toggle ↔ Component Audit

I cross-referenced every entry in `getSections()` (DashboardCustomizeMenu.tsx) against the `sectionComponents` map (DashboardHome.tsx) and the live data context.

| Toggle ID | In Customize | In sectionComponents | Status |
|---|---|---|---|
| daily_briefing | ✓ | ✓ | OK |
| quick_actions | ✓ | ✓ | OK |
| todays_queue | ✓ | ✓ | OK |
| quick_stats | ✓ | ✓ | OK |
| todays_prep | ✓ | ✓ | OK |
| level_progress | ✓ | ✓ | OK |
| graduation_kpi | ✓ | ✓ | OK |
| analytics | ✓ | special-cased | OK |
| active_campaigns | ✓ | ✓ | OK |
| **payroll_deadline** | ✓ | **MISSING** | **Broken — toggle does nothing** |
| payday_countdown | ✓ | ✓ | Renders, but **silently null** when org lacks `payroll_enabled` flag or user has no payroll settings |
| schedule_tasks | ✓ | ✓ | OK |
| announcements | ✓ | (intentionally moved to drawer) | Toggle is dead — should be removed from menu |
| client_engine | ✓ | ✓ | OK |
| widgets | ✓ | ✓ | OK |

Confirmed via DB: `organization_feature_flags` has zero rows for `payroll_enabled` on Drop Dead Salons (`fa23cd95-...`). That's why the toggle appears live but the banner never paints.

## Fix Plan

### 1. Wire missing `payroll_deadline` render branch
In `src/pages/dashboard/DashboardHome.tsx`:
- Lazy-import `PayrollDeadlineCard` from `@/components/dashboard/payroll/PayrollDeadlineCard`.
- Add to `sectionComponents`:
  ```ts
  payroll_deadline: isLeadership ? <PayrollDeadlineCard /> : null,
  ```
  The card already self-gates on the `manage_payroll` permission internally, so this is the correct outer gate (matches the customize menu's `isVisible: ctx.isLeadership`).

### 2. Remove dead `announcements` toggle
The render branch was deliberately removed (moved to floating `AnnouncementsDrawer`). Remove the toggle entry from `getSections()` in `DashboardCustomizeMenu.tsx` and add `'announcements'` to `RETIRED_SECTION_IDS` in `useDashboardLayout.ts` so existing layouts self-clean (the retirement registry already exists for exactly this case — see mem://architecture/dashboard-section-retirement-registry).

### 3. Surface Payday Countdown suppression reason (visibility-contracts compliance)
The banner's silent-null behavior is correct per the Visibility Contracts doctrine, but the operator has no way to know why their enabled toggle does nothing. Two coordinated changes:

**a. Dev-only suppression log** (already the doctrine pattern):
In `PaydayCountdownBanner.tsx`, before each `return null`, emit through the existing `visibility-contract-bus` (`src/lib/dev/visibility-contract-bus.ts`) with kebab-case reasons:
- `payroll-not-entitled` (org has no `payroll_enabled` flag)
- `no-payroll-settings` (user has no settings record)
- `loading` (skip — not a real suppression)

**b. Customize menu hint**:
In `DashboardCustomizeMenu.tsx`, when the `payday_countdown` toggle row is enabled but the org lacks the `payroll_enabled` flag, show a small inline subtext under the description:
> "Enable Payroll in Settings → Payroll to surface this card."
Use the existing `usePayrollEntitlement` hook to detect the gap. No behavior change beyond the hint — toggle remains togglable.

### 4. Author-time guard against future drift
Add a Vitest test `src/__tests__/dashboard-section-contract.test.ts` that:
- Imports the section IDs from `getSections()` in `DashboardCustomizeMenu.tsx`.
- Imports the keys of `sectionComponents` from `DashboardHome.tsx` (export the keys array as a constant for testability).
- Asserts every non-retired toggle ID has a render branch, and every render key has a toggle (excluding the `analytics` virtual marker).
- This is the canonical five-part canon pattern (mem://architecture/canon-pattern): invariant + Vitest enforces it forever.

## Files to Edit

- `src/pages/dashboard/DashboardHome.tsx` — add `payroll_deadline` lazy import + render branch; export `SECTION_COMPONENT_IDS` constant for the test.
- `src/components/dashboard/DashboardCustomizeMenu.tsx` — remove `announcements` entry; add suppression hint under `payday_countdown`.
- `src/hooks/useDashboardLayout.ts` — add `'announcements'` to `RETIRED_SECTION_IDS`.
- `src/components/dashboard/mypay/PaydayCountdownBanner.tsx` — emit dev-only suppression reasons via visibility-contract-bus.
- `src/__tests__/dashboard-section-contract.test.ts` (new) — author-time invariant.

## Out of Scope

- Enabling the `payroll_enabled` flag for Drop Dead Salons. That's an operator decision, not a code fix. The hint in step 3b tells them where to do it.
- Refactoring the analytics block (already addressed in prior wave).
