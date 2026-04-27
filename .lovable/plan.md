## Plan: Account Owner Dashboard — Phase 2 (Operator Primitives + Visual Refresh)

Pivoting away from role-variant work. Anchoring back on the **original Command Center thesis** (msg #9946): a true operator dashboard answers four questions every morning — *Is the building OK? What needs me? What is the team feeling? What's coming?* — not "how are sales trending."

### Where we are

**Phase 1 is fully shipped** (re-confirmed against the DB and source):
- ✅ 1.1 Quick Stats rollup ↔ global location toggle with scope label
- ✅ 1.2 `dashboard_role_layouts` table + Owner-only `DashboardCustomizeMenu` + "Preview as role"
- ✅ 1.3 `TasksCard` "Deferred" tab (overdue + snoozed + expired, capped at 10)
- ✅ 1.4 `announcement_read_stats` SQL view
- ✅ Stylist Privacy Contract (the role-variant detour) — locked and tested

**What the account_owner template still pins**: a wall of analytics cards (`executive_summary`, `sales_overview`, `revenue_breakdown`, `top_performers`, `capacity_utilization`, `commission_summary`, `true_profit`, `locations_rollup`).

**What's missing**: the four operator-pulse primitives the original framework called out as Tier-1.

---

### Phase 2 — Operator Primitives (build)

Four self-contained sections. Each follows the visibility-contract canon (silent when materiality threshold is unmet), is owner-scoped via existing role gates, and respects the global location toggle.

**2.1 Today at a Glance** (`today_at_glance`)
The "is the building OK?" answer. A high-density top strip showing, for the active location scope:
- Stylists on today / called out / open chairs
- VIPs in today (CLV tier 1 or top-decile)
- First-time clients in today
- Double-bookings + coverage gaps

Reads from `appointments` + `employee_profiles` + existing `useEffectiveSchedule`. Returns `null` if the day is empty (silent at start of day before appointments exist is wrong — show empty state with the date).

**2.2 Decisions Awaiting You** (`decisions_awaiting`)
A *short* queue (cap 5) of items only the operator can resolve:
- Time-off requests pending approval (`time_off_requests` where `status = 'pending'`)
- Refund approvals over the org's threshold (existing `refund_approvals`)
- Commission disputes (`commission_disputes` where `status = 'open'`)
- New-hire offer drafts awaiting send

This is **not** the generic task list — escalations only. Click → opens the relevant settings drawer.

**2.3 Team Pulse** (`team_pulse`)
The culture/recognition layer. Two columns inside one card:
- **Recognize**: birthdays this week, work anniversaries, levels-up eligible, stylists with 3+ rebookings this week
- **Intervene**: stylists with declining rebooking rate (>15% drop WoW), 7+ days since last appointment, missed performance check-ins

Materiality: card hides if both columns are empty. Each row is a deterministic gate, never AI-authored (per AI-constraints doctrine).

**2.4 Upcoming 14 Days** (`upcoming_events`)
Curated, *operator-relevant* events only — not a generic calendar:
- Education days, vendor visits, photoshoots
- Time-off clusters that create coverage risk (≥2 stylists same day)
- Holiday closures
- Lease / insurance renewals (from existing `org_compliance_dates` if present, otherwise deferred)

Two-column compressed list, capped at 8 rows. Reads operator-curated `org_calendar_events` table (new, lightweight: `id, organization_id, event_date, event_type, label, location_id, created_by`).

**2.5 Owner template reseed**
Update the `account_owner` `dashboard_layout_templates` row to lead with the four new primitives, demote the analytics wall to the bottom of the scroll, and keep `daily_briefing` + `quick_stats` at the top:

```text
1. daily_briefing
2. today_at_glance         ← new
3. decisions_awaiting      ← new
4. quick_stats
5. team_pulse              ← new
6. upcoming_events         ← new
7. team_dashboards
8. tasks
9. pinned analytics block (existing wall)
10. announcements
11. widgets
```

---

### Visual Refresh — needs your call

The "new look" is the second half of your ask but it's wide open. Three viable directions, each with very different scope:

**A) Tighten the current bento** (smallest scope) — keep the card grid, push contrast/spacing/typography to luxury-glass standard, audit padding/radii against the design-token canon. ~1 build cycle.

**B) Bento-with-rails** (medium) — split the canvas into a left operator rail (Decisions, Pulse, Upcoming, Announcements) and a right scrollable analytics column. This matches the original framework from msg #9946 and is the layout most scaling salons use. ~2 build cycles.

**C) Operator Mode top-bar** (largest) — bring "Today at a Glance" into a persistent slim top-bar that follows scroll, with everything else as bento below. Closer to a Bloomberg/Linear-style operator surface. ~3+ build cycles.

I'll ask one targeted question after this plan is approved so we don't burn a cycle on the wrong direction.

---

### Files

**New**
- `src/components/dashboard/owner/TodayAtAGlanceSection.tsx`
- `src/components/dashboard/owner/DecisionsAwaitingSection.tsx`
- `src/components/dashboard/owner/TeamPulseSection.tsx`
- `src/components/dashboard/owner/UpcomingEventsSection.tsx`
- `src/hooks/useOwnerDecisionsQueue.ts`
- `src/hooks/useTeamPulse.ts`
- `src/hooks/useUpcomingOperatorEvents.ts`

**Modified**
- `src/pages/dashboard/DashboardHome.tsx` — register four new section IDs
- `src/lib/dashboard/dashboardSections.ts` (or equivalent registry) — add labels + icons
- `src/lib/dashboard/stylistPrivacy.ts` — add the four IDs to `STYLIST_FORBIDDEN_SECTIONS` (none of these belong on stylist layouts)

**DB migration**
- New table `org_calendar_events` (RLS scoped to `organization_id`, owner/admin write, all members read)
- Reseed `dashboard_layout_templates` row for `role_name = 'account_owner'`

---

### Acceptance criteria

- Owner dashboard leads with operator state, not analytics.
- Each new section returns `null` when its materiality threshold is unmet (visibility-contract compliant) and emits a dev-only suppression log.
- All four sections respect the global location toggle (rollup vs single-location).
- All `formatCurrency` calls inside the new sections wrapped in `BlurredAmount`.
- Stylist Privacy Contract test still passes (new IDs explicitly forbidden for stylists).
- No new analytics cards added — Phase 2 is purely operator state, not data viz.

---

### Out of scope (deferred)

- Manager variant (Phase 3)
- AI-authored coaching nudges on owner side (doctrine forbids it)
- Lease/insurance renewal source if `org_compliance_dates` doesn't exist — defer to a follow-up with revisit trigger documented in the Deferral Register