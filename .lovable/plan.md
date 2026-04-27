# Make Phase 1+2 Visible (Option A → Option B)

Phase 1 and Phase 2 shipped governance, RLS, and gates — all correct, none of it discoverable from the Account Owner's dashboard at a glance. This wave fixes that.

## Part A — Verification (no code, ~5 min)

I'll walk you through opening the Customize menu and confirming three surfaces render:

1. **Customize Dashboard** button on the owner home opens `PremiumFloatingPanel`.
2. Inside the panel: **role selector dropdown** ("Editing as: My Layout / Account Owner / Manager / Stylist / …").
3. When a role other than "My Layout" is picked: **"Editing org-wide layout for [role]" badge** appears, and the **Audit Log panel** (`DashboardLayoutAuditPanel`) populates with prior changes for that role.
4. Save / Reset buttons route to `dashboard_role_layouts` (not personal `user_preferences`) when in role-edit mode.

If any of those four don't render correctly, we patch before Part B. Expected outcome: all four work, since the wiring is in place at lines 288–650 of `DashboardCustomizeMenu.tsx`.

## Part B — Add the "Team Dashboards" governance card

Promote role-layout governance out of the buried Customize menu into a first-class card on the owner home. This makes Phase 1+2 *feel* like a feature.

### What gets added

A new dashboard section, `team_dashboards`, owner-only, rendered between `hub_quicklinks` and `payday_countdown` in the `account_owner` template:

```text
┌──────────────────────────────────────────────────────────────┐
│  TEAM DASHBOARDS                              [Customize ▸]  │
│  Curate what each role sees when they log in.                │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │
│  │ MANAGER     │ │ STYLIST     │ │ RECEPTION   │ │ + More │ │
│  │ Custom      │ │ Default     │ │ Default     │ │        │ │
│  │ Edited 2d   │ │             │ │             │ │        │ │
│  │ [Preview →] │ │ [Preview →] │ │ [Preview →] │ │        │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │
└──────────────────────────────────────────────────────────────┘
```

Each role tile shows:
- Role name (`font-display`, uppercase, Termina)
- Status: **"Custom"** (org override exists) or **"Default"** (using system template)
- Last-edited timestamp pulled from `dashboard_role_layout_audit`
- **Preview** button → flips `ViewAsContext` to that role and scrolls to top, so the owner sees the dashboard as that role would
- **Customize** opens the floating panel already in role-edit mode

### Files

| File | Change |
|---|---|
| `src/components/dashboard/TeamDashboardsCard.tsx` (new) | The card component. Reads `dashboard_role_layouts` + most-recent `dashboard_role_layout_audit` row per role. Owner-only render guard via `useCanCustomizeDashboardLayouts`. |
| `src/hooks/useTeamDashboardSummary.ts` (new) | Aggregates per-role status: has-override + last-edited + last-editor display name. Single query, joins `dashboard_role_layouts` to `employee_profiles`. |
| `src/pages/dashboard/DashboardHome.tsx` | Register `team_dashboards` in the section component map. Owner-only gate. |
| `src/hooks/useDashboardLayout.ts` | Add `team_dashboards` to `DEFAULT_LAYOUT.sections/sectionOrder`. Add migration step so existing owner layouts pick it up (mirrors how `hub_quicklinks` was backfilled). |
| `supabase/migrations/<ts>_seed_team_dashboards_section.sql` | Update the `account_owner` template row in `dashboard_layout_templates` to include `team_dashboards` after `hub_quicklinks`. |

### Behavior rules

- **Owner-only**: Card returns `null` for non-owners (uses existing `useCanCustomizeDashboardLayouts`).
- **Empty state**: If org has no managers/stylists yet, show one tile per role from the canonical role list with "No staff assigned yet" subtitle.
- **Preview action**: Calls `setViewAsRole(role)` from `ViewAsContext`. The dashboard re-renders through the role-keyed layout resolver we already built. A subtle banner appears at top: "Previewing as Manager · Exit preview".
- **Customize action**: Opens the existing `PremiumFloatingPanel` Customize Menu with `viewAsRole` pre-selected.
- **No new RLS**: All reads go through existing policies (`dashboard_role_layouts` + audit table already gated to primary owner / platform).

### Visual standards

- `tokens.card.iconBox` for the LayoutDashboard icon
- Title uses `font-display text-base tracking-wide` (Termina uppercase)
- Role tiles: `bg-muted/40`, `rounded-xl`, `p-4`, hover `bg-muted/60`
- Status badge: `Default` = muted; `Custom` = primary tint
- Last-edited timestamp: `text-xs text-muted-foreground font-sans` (no uppercase)
- Buttons: `tokens.button.cardAction` (pill, h-9)

### Out of scope (deferred)

- Per-role analytics ("what does the manager actually see most?") — Phase 3+
- Cloning a role layout to another role — Phase 3+
- Side-by-side compare view — only if Part B feels insufficient after rollout

## Acceptance

After this wave:
1. Logged in as Account Owner → "Team Dashboards" card visible on home, between Hub Quicklinks and the rest of the dashboard.
2. Card lists Manager / Stylist / Receptionist / Admin tiles with correct Default vs Custom state.
3. Clicking **Preview** on Manager tile flips the entire dashboard into manager view (no financial pinned cards, location-scoped quick stats) — this finally surfaces all the Phase 2 work visually.
4. Clicking **Customize** opens the floating panel already targeting that role.
5. Audit timestamps update in real-time after editing a role's layout.

Once approved, I'll execute Part A first (give you a 4-step click-through), then build Part B.