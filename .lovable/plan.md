# Surface toggled-on cards even when configuration is incomplete

## The problem

Payday Countdown is enabled in Customize, but nothing renders on the dashboard because `usePayrollEntitlement` returns false or `useMyPayData().settings` is null. The card silently `return null`s and reports to the dev visibility bus — invisible to the operator. They have no idea why their toggled-on card vanished, and no path to fix it.

`PayrollDeadlineCard` already solved this correctly (amber "Pay schedule not configured · Configure" prompt with dismiss). The fix is to extend that pattern across every togglable section, while preserving the **Visibility Contract** doctrine for materiality-gated analytics surfaces (those must stay silent).

## Doctrine reconciliation

Two kinds of "silence" must be distinguished:

| Type | Trigger | Render when empty |
|------|---------|-------------------|
| **Materiality contract** | Data threshold unmet (`<3 events in 12wk`) | `null` — silence is signal (per `mem://architecture/visibility-contracts`) |
| **Configuration gate** | Feature toggled on, but prerequisite missing (no payroll connection, no schedule, no commission model) | Compact configurator stub with deep link |

The user explicitly opting in via Customize converts silence from "valid signal" to "broken UI." Configuration stubs honor the opt-in without polluting analytic surfaces.

## What to build

### 1. New primitive: `<ConfigurationStubCard />`

`src/components/dashboard/ConfigurationStubCard.tsx` — single canonical component all togglable sections use when their prerequisite is missing. Props:

- `sectionId` (drives dismiss key + visibility-bus reason)
- `title` (e.g., "Payday Countdown")
- `reason` (e.g., "Connect payroll to surface your next paycheck")
- `ctaLabel` + `ctaTo` (deep link to the exact settings page)
- `icon` (Lucide component matching the live card)
- `dismissible` (default true; persists per user via `user_preferences.dashboard_layout.dismissedStubs[]`)

Visual: amber-tinted compact card matching `PayrollDeadlineCard`'s existing not-configured branch. Includes Settings icon + 1-line copy + outline CTA + X dismiss. Honors `tokens.card.*`, never uppercase body, font-medium max.

Doctrine alignment:
- Calls `reportVisibilitySuppression(sectionId, 'awaiting-configuration', { ctaTo })` so the dev bus sees configuration-gated stubs distinctly from materiality silence.
- Add `awaiting-configuration` as a new **Common-tier** reason in the Visibility Contracts taxonomy memory.

### 2. Refactor opt-in cards to use the stub

Pattern change (per card):

```tsx
// Before
if (!isEntitled) { reportVisibilitySuppression(...); return null; }
if (!settings)   { reportVisibilitySuppression(...); return null; }

// After
if (!isEntitled) return <ConfigurationStubCard sectionId="payday_countdown"
  title="Payday Countdown" reason="Enable Payroll to surface your next paycheck"
  ctaLabel="Enable Payroll" ctaTo={dashPath('/admin/settings/features')}
  icon={Banknote} />;
if (!settings) return <ConfigurationStubCard ... ctaTo={dashPath('/my-pay/settings')} />;
```

First-pass conversions (cards confirmed togglable in `DashboardCustomizeMenu`):

- `PaydayCountdownBanner` — entitlement + settings branches
- `PayrollDeadlineCard` — collapse the existing inline not-configured branch into the stub primitive (delete the duplicated localStorage key in favor of the unified `dismissedStubs[]`)
- `ActiveCampaignsCard`, `TodaysPrepCard`, `ClientEngineCard`, `LevelProgressCard`, `GraduationKpiCard` — audit each for `return null` on missing config (entitlement, KPI architecture gate, level config) and convert.

I'll grep `src/pages/dashboard/DashboardHome.tsx`'s `sectionRegistry` against each component to enumerate the full list during implementation, then convert them in one sweep.

### 3. Differentiate enforcement gates

Some "missing config" cases are actually **structural enforcement gates** (`gate_commission_model`, `gate_kpi_architecture`, `gate_baselines`, `gate_margin_baselines` per project doctrine). Those already have `EnforcementGateBanner` — the stub must NOT duplicate them. Rule for the stub:

- If the missing prerequisite maps to an enforcement gate already shown elsewhere on the page, render the stub but with copy that **points to the gate** ("Define commission architecture to unlock") rather than offering a direct CTA.
- Never the stub for materiality contracts (sparkline points, YoY overlap, etc.) — those keep `return null`.

### 4. Customize menu badge

In `DashboardCustomizeMenu.tsx`, when a section is toggled on but its prerequisite is unmet, show a small "Needs setup" badge next to the toggle (the menu already has the `isPayrollEntitled` hint copy on line 770 — generalize this). Provides discoverability before the user even opens the dashboard.

Hook surface:

```ts
// src/hooks/dashboard/useSectionConfigStatus.ts
useSectionConfigStatus(): Record<sectionId, 'ready' | 'needs-setup' | 'gated-structural'>
```

Drives both the Customize menu badge and (optionally) the stub itself, so prerequisite logic lives in one file rather than scattered across cards.

### 5. Dismiss persistence

Move the existing `localStorage.getItem('payroll-deadline-config-dismissed')` (and any future per-stub keys) into `user_preferences.dashboard_layout.dismissedStubs: string[]`. Reasons:

- Survives device changes (operator dismisses on iPad → desktop respects it).
- Single source of truth alongside the other dashboard prefs.
- A single `Reset dismissed prompts` action in Customize menu can re-surface them.

Read/write through the existing `useDashboardLayout` mutation pipeline (already mirrors writes across sibling roles per the recent role-dashboards work — same plumbing reused).

## Files

```text
NEW  src/components/dashboard/ConfigurationStubCard.tsx
NEW  src/hooks/dashboard/useSectionConfigStatus.ts
EDIT src/components/dashboard/mypay/PaydayCountdownBanner.tsx
EDIT src/components/dashboard/payroll/PayrollDeadlineCard.tsx        (collapse inline stub)
EDIT src/components/dashboard/DashboardCustomizeMenu.tsx             (generalize "needs setup" hint)
EDIT src/hooks/useDashboardLayout.ts                                 (dismissedStubs[] field)
EDIT src/lib/dev/visibility-contract-bus.ts                          (none — just new reason string)
EDIT mem://architecture/visibility-contracts.md                      (add `awaiting-configuration` to taxonomy + note opt-in distinction)
+ per-card edits as the audit sweep enumerates them
```

## What stays the same

- All Color Bar materiality contracts (`SuspensionVelocityCard`, `ChemicalCostTrendCard`, `SeasonalDemandOverlay`, etc.) keep returning `null`. They are not in the Customize menu as opt-in cards — the operator never explicitly asked for them.
- `EnforcementGateBanner` doctrine unchanged.
- No DB migration; `user_preferences.dashboard_layout` is jsonb.

## Open question

For sections gated by feature flag (e.g., `payroll_enabled = false`), do we want the stub to (a) link to feature toggle settings so the owner can enable Payroll, or (b) hide entirely for non-owners since they can't enable it themselves? Recommendation: (a) for owners/admins, (b) for stylists — driven by `useHasEffectivePermission`. I'll implement that split unless you say otherwise.

## Prompt feedback

Strong prompt — you correctly identified a class of failure mode (toggled-on card silently invisible) from a single concrete example (Payday Countdown). What made it strong: the diagnosis ("likely because payroll deadline has not been configured") let me jump straight to the doctrine reconciliation instead of hunting for the bug.

To level up further: when you spot a class issue from one example, you can pre-empt scope creep by saying "audit every togglable section for this same pattern" — that nudges me to enumerate exhaustively rather than fixing only the named card. You did this implicitly with "all toggled cards," which worked, but making the audit step explicit gets you a more defensible plan every time.
