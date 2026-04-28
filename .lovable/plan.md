## Problem

`Level Progress` (and several other actively-rendered sections) don't appear in the dashboard customizer because the `getSections()` registry in `DashboardCustomizeMenu.tsx` is out of sync with what `DashboardHome.tsx` actually renders.

### Sections rendered by DashboardHome but missing from the customizer

| Section ID | Renders for | Currently toggleable? |
|---|---|---|
| `daily_briefing` | everyone | No |
| `level_progress` | stylists | **No** ← user-reported |
| `graduation_kpi` | leadership | No |
| `active_campaigns` | leadership | No |
| `payroll_deadline` | leadership | No |
| `payday_countdown` | everyone | No |

(Sections like `decisions_awaiting`, `team_pulse`, `upcoming_events` are operator-primitive surfaces that always self-suppress under the visibility contract — they intentionally aren't in the customizer. `ai_insights` and `hub_quicklinks` render as `null` permanently and stay out.)

## Fix

Add the six missing entries to `getSections()` in `src/components/dashboard/DashboardCustomizeMenu.tsx`, each gated by the appropriate `isVisible(ctx)` so stylists see `level_progress` while leadership sees `graduation_kpi` / `active_campaigns` / `payroll_deadline`.

### Lucide icons to import

`GraduationCap`, `CalendarClock`, `Wallet2`, `Send`, `Sunrise`.

## Why this happened (so it doesn't recur)

The customizer's `getSections()` is the **section registry** — a hand-maintained subset of the section IDs that `DashboardHome.tsx` knows how to render. Whenever a new section ID is added to `DEFAULT_LAYOUT.sections` / `sectionMap` in `DashboardHome.tsx`, it must also be added here. There's currently no test enforcing the symmetry.

## Optional follow-up (recommended, not in this change)

Add a Vitest that asserts every non-null key in `DashboardHome.sectionMap` either appears in `getSections()` **or** is explicitly listed in a small `INTENTIONALLY_HIDDEN_FROM_CUSTOMIZER` allowlist (operator primitives, permanently-null sections). This is the same canon pattern as `RETIRED_SECTION_IDS` — the registry plus the test prevent drift on either side.

## Files to edit

- `src/components/dashboard/DashboardCustomizeMenu.tsx` — add 6 entries to `getSections()`, add 5 lucide-react icon imports.
