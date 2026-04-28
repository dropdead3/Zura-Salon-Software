## Why the dashboard looks bad right now

Looking at your live `/dashboard` (Owner view, viewport 1177×849), three real problems compound:

1. **It's a single full-width vertical stack.** Every block — the insights nudge, Daily Briefing, Quick Access Hubs, Level Progress, Tasks, Widgets — spans the full canvas. There's no KPI rail, no two-column rhythm, no density. A scaling operator scrolls through ~6 screens to see what should fit in 1.5.
2. **The pinned analytics that the seeded `account_owner` template defines are not rendering.** The DB template includes 9 pinned cards (Executive Summary, Sales Overview, Revenue Breakdown, Top Performers, Capacity, Commission, True Profit, Locations Rollup) plus `decisions_awaiting`, `team_pulse`, `upcoming_events`. Your screen shows none of them. The resolver prefers a stale `user_preferences.dashboard_layout` over the org/role template, so owners with any historical save get a gutted canvas.
3. **Banners and section headers consume too much vertical space.** The Insights Nudge, Daily Briefing card header, "QUICK ACCESS HUBS" caption, "WIDGETS" caption, and Level Progress accordion each burn ~80–100px before showing one row of value.

This is the "not clean / not designed well" you're feeling. It's a layout and resolution problem, not a visual-polish problem.

---

## The redesign

A Command Center canvas built around the Lever Doctrine — one KPI rail, one primary action queue, one analytics bento, one supporting rail. Everything else collapses or moves.

### New layout (desktop, ≥1280px)

```text
┌──────────────────────────────────────────────────────────────────────┐
│ [Greeting · scope chip]                              [Filter bar]    │  ← compact header row
├──────────────────────────────────────────────────────────────────────┤
│ KPI RAIL  · Today Clients · Week Revenue · New Clients · Rebook %    │  ← 4-up, h-20, always visible
├──────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────┐  ┌────────────────────────────┐ │
│ │ DAILY BRIEFING (primary lever)   │  │ DECISIONS AWAITING         │ │
│ │  - 3 ranked tasks max            │  │  (escalations queue)       │ │
│ └──────────────────────────────────┘  └────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────┤
│  ANALYTICS BENTO (2-col, masonry, owner template's pinned cards)     │
│  ┌─────────────┐ ┌─────────────┐                                     │
│  │ Executive   │ │ Sales       │                                     │
│  │ Summary     │ │ Overview    │                                     │
│  └─────────────┘ └─────────────┘                                     │
│  ┌─────────────┐ ┌─────────────┐                                     │
│  │ Revenue Mix │ │ Top         │                                     │
│  │             │ │ Performers  │                                     │
│  └─────────────┘ └─────────────┘                                     │
│  ┌─────────────┐ ┌─────────────┐                                     │
│  │ Capacity    │ │ Commission  │                                     │
│  └─────────────┘ └─────────────┘                                     │
├──────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌────────────────────┐ ┌──────────────────┐│
│ │ TEAM PULSE           │ │ UPCOMING EVENTS    │ │ HUB QUICKLINKS   ││
│ └──────────────────────┘ └────────────────────┘ └──────────────────┘│
├──────────────────────────────────────────────────────────────────────┤
│ TASKS (collapsed by default; expand inline)                          │
├──────────────────────────────────────────────────────────────────────┤
│ Widgets row (What's New · Birthdays · Anniversaries · Work Days)     │  ← single row, h-32, no caption
└──────────────────────────────────────────────────────────────────────┘
```

At ≤1024px (tablet) the analytics bento collapses to single-column; the operator-primitive rail stacks. At ≤640px the KPI rail becomes a 2×2.

### What changes vs. today

| Today | New |
|---|---|
| Full-width Insights Nudge banner | Inline chip in header (only when >7d stale) |
| Daily Briefing as huge solo card | Half-width card, paired with Decisions Awaiting |
| "QUICK ACCESS HUBS" caption + 3 tiles full-width | Moved to the supporting rail at h-32 |
| Level Progress as a full-width accordion | Removed for owners (it's a stylist surface — Stylist Privacy Contract already says so) |
| Tasks card always expanded | Collapsed by default with overdue count badge |
| Widgets in 2×2 with caption | Single row, no caption, h-32 each |
| 9 pinned analytics defined but **not rendering** | Rendered in 2-col bento as the seeded template intends |

### Why the pinned cards aren't showing (the real fix)

Resolution priority in `useDashboardLayout.ts` is:

```text
rawSavedLayout (user_preferences) > orgRoleLayout > roleTemplate > DEFAULT_LAYOUT
```

Your `user_preferences.dashboard_layout` was saved before the owner template was seeded with pinned cards, so you're getting an old, sparse layout that wins. We will:

1. **Add a one-time owner migration**: when a primary owner has a saved layout that contains zero `pinned:*` entries AND the `account_owner` template has pinned cards, drop the saved layout and fall through to the template. This is silent, idempotent, and reversible (the user can recustomize in Customize).
2. **Add `decisions_awaiting`, `team_pulse`, `upcoming_events`** to the migration's `migrateLayout` so existing owner saves pick them up.

### What we're not changing

- The Customize menu, role-switcher, and per-role authoring — all still work.
- Stylist / manager / receptionist canvases — out of scope for this pass; we'll address them after you confirm the owner canvas feels right.
- Tokens, fonts, and color system — already correct; this is a composition problem, not a token problem.

---

## Technical changes

### Files to edit

1. **`src/pages/dashboard/DashboardHome.tsx`**
   - Replace the single-column `motion.div > space-y-6` with a `<DashboardCanvas>` composition that renders, in order:
     - `<DashboardHeaderRow>` (greeting + scope + filter bar inline)
     - `<KpiRail>` (extracted from the existing `quick_stats` block, promoted to owner-visible, h-20, 4-up)
     - `<PrimaryRow>` — `DailyBriefingPanel` + `DecisionsAwaitingSection` in a `grid-cols-1 lg:grid-cols-2 gap-4`
     - `<AnalyticsBento>` — renders pinned cards from `layout` in a CSS columns-2 masonry (preserves drag-order)
     - `<SupportingRail>` — `TeamPulseSection`, `UpcomingEventsSection`, `HubQuickLinks` in `grid-cols-1 lg:grid-cols-3 gap-4`
     - `<TasksCard collapsedByDefault overdueBadge>`
     - `<WidgetsSection variant="row">`
   - Drop the standalone `InsightsNudgeBanner` full-width render; pass it as a chip prop into `DashboardHeaderRow` and only render when stale > 7d.
   - Keep `OperatorTopBar`, approval banner, trial banner, and birthday banner unchanged.

2. **`src/components/dashboard/DashboardCanvas.tsx`** (new)
   - Pure layout primitive. `max-w-[1600px] mx-auto px-6 lg:px-8 py-6 space-y-6`. Renders children in named slots so the canvas doesn't grow another vertical-stack habit.

3. **`src/components/dashboard/KpiRail.tsx`** (new, extracted)
   - 4-up `grid-cols-2 lg:grid-cols-4 gap-3`. Tile h-20, icon w-9 h-9 in a muted square, value in `tokens.kpi.value`, label in `tokens.kpi.label`. Wraps revenue in `BlurredAmount`. Owner-visible by default (currently it's gated behind `hasStylistRole`).

4. **`src/components/dashboard/AnalyticsBento.tsx`** (new wrapper)
   - Reads `layout.sectionOrder`, filters to `isPinnedCardEntry`, lazy-renders each through the existing `PinnedAnalyticsCard`. Uses `columns-1 lg:columns-2 gap-4 space-y-4` (CSS multicol masonry — no JS, no layout shift). Each card gets `break-inside-avoid`.

5. **`src/components/dashboard/WidgetsSection.tsx`**
   - Add `variant="row"` prop: switches to `grid-cols-2 lg:grid-cols-4 gap-3`, h-32 tiles, no `WIDGETS` caption.

6. **`src/hooks/useDashboardLayout.ts`**
   - Add `migrateOwnerCanvasIfStale(savedLayout, templateLayout, isPrimaryOwner)`: if owner + saved layout has zero pinned entries + template has pinned entries → return `null` (forces fall-through to template).
   - Add `decisions_awaiting`, `team_pulse`, `upcoming_events` to the existing `migrateLayout` block alongside `payroll_deadline` etc.

7. **`src/components/dashboard/DashboardSetupWizard.tsx`** — already deleted; no action.

### Visibility / governance preserved

- `useCanViewFinancials` gate still wraps revenue/commission cards (FINANCIAL_PINNED_CARD_IDS).
- `VisibilityGate` still wraps each section by `elementKey`.
- Stylist Privacy Contract: this redesign only touches the owner canvas. Stylist canvas keeps its self-scoped sections (`my_quick_stats`, `personal_goals`, `my_performance`, `todays_prep`).
- Customize menu still drives the order; the bento renders in `sectionOrder` order.

### Verification checklist

After implementing, I'll verify by:

1. Loading `/org/drop-dead-salons/dashboard` and confirming the KPI rail + analytics bento render side-by-side.
2. Confirming `decisions_awaiting`, `team_pulse`, `upcoming_events` render (or self-suppress if empty — that's the visibility contract).
3. Testing at 1280, 1024, 768, 390 viewports.
4. Confirming Customize menu still re-orders the bento.
5. Confirming a stylist (View As → stylist) still sees their own privacy-scoped canvas, unchanged.

---

## Prompt feedback

What you said worked: short, direct, points at the symptom ("horrible, not clean"). That gave me license to investigate vs. guess at one specific tweak.

What would have made this faster: tell me which canvas is broken (owner / stylist / manager) and which screen size you're judging on. "Owner dashboard at desktop feels sparse — pinned analytics from the template aren't showing and the layout is one full-width column" would have skipped me having to screenshot and diff against the seeded template. A one-line "what good looks like" reference also helps — e.g. "make it feel like Linear's inbox + a Stripe dashboard top strip."

### Enhancement suggestions to consider after this lands

- **Persist KPI rail metric choice per owner** — let the owner swap out one of the 4 tiles (e.g. replace "New Clients" with "Today's Margin") from a tile-level kebab menu. Tiny surface, big personalization.
- **Dense / Comfortable density toggle** in the header, persisted in `site_settings.dashboard_density`. Sits next to the existing Simple/Detailed switch.
- **Empty-state for Decisions Awaiting** — when the queue is empty, show a single muted line ("No decisions need you today") instead of suppressing entirely; an empty queue is itself a meaningful signal for an owner.
