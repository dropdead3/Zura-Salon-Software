

# Addendum: additional per-team-member levers worth wiring into the hub

The core 7-tab plan covers the high-frequency levers (profile, role, schedule, services, comp, level, security). Below are the **additional per-person controls that already exist in the codebase** but live elsewhere — worth folding into the Team Member detail page so the hub is genuinely the single home.

## Gaps to close

### 1. POS / Phorest staff mapping
- **Lives today**: `/dashboard/admin/phorest-settings` (`PhorestSettings.tsx`) — admin selects a user from a dropdown, links to a Phorest staff record. The mapping powers analytics name resolution (`resolveStaffNames`) and live session attribution.
- **Why it belongs on the person**: this is per-person plumbing, not a global setting. Today the admin has to leave the team member page, find them in a dropdown, link, leave again.
- **Where to surface**: small section inside the **Profile** tab (or its own micro-tab "Integrations" if the Profile tab gets crowded). Read-only chip if mapped: *"Linked to Phorest: Janet A."* with `[Change]` / `[Unlink]`. If unmapped: `[Link to POS staff record]` opening the existing search modal pre-bound to this user.

### 2. Coach assignment + program enrollment
- **Lives today**: `useGraduationTracker` (assistants → coaches via `coach_id`), `stylist_program_enrollment` (90-day program), `coach_notes`, `one_on_one_meetings`. All scattered across coaching pages.
- **Why it belongs on the person**: assigning a coach, enrolling someone in a program, viewing their meeting cadence and coach notes is a core management action.
- **Where to surface**: new **Coaching** tab (visible only when role ∈ stylist / stylist_assistant / lead). Sections:
  - Coach assignment (current coach + change)
  - Program enrollment (active program, current day, streak, [Enroll] / [Pause])
  - Recent 1:1s (last 3, link to full history)
  - Coach notes summary (count, last entry, link)
- Tab is reused as the entry point; the underlying components stay where they are.

### 3. Time-off + PTO balance
- **Lives today**: `time_off_requests` (per-user), `employee_pto_balances` (per-user, per-policy). UI exists in coaching/calendar surfaces.
- **Why it belongs on the person**: PTO accrual, used vs available, pending requests are per-person facts.
- **Where to surface**: extend the **Schedule** tab. Below the work-days editor, add a compact "Time off" section:
  - PTO balance summary (Vacation: 24h available · Sick: 8h available)
  - Pending requests count + link to approve/reject
  - `[Add time-off request]` (admin-side path of existing dialog, pre-bound to this user)

### 4. Notification preferences
- **Lives today**: `notification_preferences` table (per-user). Today the only edit surface is self-service.
- **Why it belongs on the person**: an admin adjusting notification cadence on behalf of a stylist is rare but real (e.g., disabling 6am push during a leave).
- **Where to surface**: collapsed accordion inside the **Security** tab (low-frequency, doesn't deserve a tab). Read-only summary by default; expand to edit channels (email, push, in-app) and quiet hours.

### 5. Compensation history + audit trail
- **Lives today**: nowhere consolidated. Comp plan changes happen via `compensation_plans` mutations but no per-person history surface exists.
- **Why it belongs on the person**: "when did Janet move to 50% commission" is the most common question after "what's her commission today." Today the answer requires a SQL query.
- **Where to surface**: extend the **Compensation** tab. Below the active plan editor, add a "Plan history" timeline (effective date, plan type, rate, changed by). Read-only — edits create a new versioned plan via existing mutation.
- **Backing data**: if `compensation_plans` doesn't already store `effective_date` + `changed_by`, defer the timeline to a follow-up wave; surface a "Plan history coming soon" placeholder rather than fake data.

### 6. Activity / audit log
- **Lives today**: scattered across `audit_logs`-style tables per feature. No per-user view.
- **Why it belongs on the person**: "what did Janet change in the last 7 days" is a real management question (especially for managers with edit privileges).
- **Where to surface**: collapsed accordion inside the **Security** tab — "Recent activity" list of last 20 mutations attributed to this user. Defer if no unified activity feed exists today; do not synthesize one this wave.

### 7. Direct-messaging entry point
- **Lives today**: `/dashboard/team-chat` (Connect) with DM channels.
- **Why it belongs on the person**: when an admin is looking at someone's profile, "send them a message" is a one-click expectation.
- **Where to surface**: header of the detail page, next to the avatar — small `[Message]` button that opens the existing DM channel with this user (or creates one). Gated on Connect entitlement (`useConnectAccess`); hidden if not entitled. Zero new infrastructure.

### 8. Goals + ring-the-bell history
- **Lives today**: `ring_the_bell_entries` (per-user celebrations), goal-setting components in coaching surfaces.
- **Why it belongs on the person**: motivational/recognition surface that's a natural read for a manager opening a team member's page.
- **Where to surface**: extend the **Coaching** tab — small "Recognition" section: count of bell-rings this month, last 3 entries. Read-only; ringing the bell happens in the dock/schedule flow, not here.

## Updated tab map

```
[ Profile · Role & Access · Schedule · Services · Compensation · Level · Coaching · Security ]
```

- **Profile** gains: POS/Phorest mapping section
- **Schedule** gains: Time-off + PTO balance section
- **Compensation** gains: Plan history timeline (data permitting)
- **Level** unchanged (already covered)
- **Coaching** (new tab, role-gated): coach assignment, program enrollment, 1:1s, coach notes summary, recognition
- **Security** gains: notification preferences accordion, recent activity accordion (data permitting)
- **Header** gains: `[Message]` button (Connect-gated)

## Files affected (delta on top of prior plan)

| File | Change |
|---|---|
| `src/components/dashboard/team-members/TeamMemberHeader.tsx` | Add Connect-gated `[Message]` button |
| `src/components/dashboard/team-members/tabs/ProfileTab.tsx` | Add POS/Phorest mapping section (reuses `usePhorestSync` create/delete mapping mutations) |
| `src/components/dashboard/team-members/tabs/ScheduleTab.tsx` | Add Time-off summary + PTO balance section (reuses `useTimeOffRequests`, `usePTOBalances`) |
| `src/components/dashboard/team-members/tabs/CompensationTab.tsx` | Add Plan history timeline (read-only, only if version metadata exists) |
| `src/components/dashboard/team-members/tabs/CoachingTab.tsx` *(new)* | Coach assignment, program enrollment, 1:1s, coach notes summary, recognition |
| `src/components/dashboard/team-members/tabs/SecurityTab.tsx` | Add notification preferences accordion + recent activity accordion |

## What stays out of scope (queue separately)

- **Bulk operations** across team members (still v2 — call out in the parent plan).
- **Self-service approval flows** (e.g., team member submits PTO → manager approves on detail page). The detail page should *display* pending requests this wave; full approval workflow is its own scope.
- **Compensation history backfill** — if `compensation_plans` doesn't already track effective dates and changed-by, the timeline is gated on a small migration; defer until that schema lands.
- **Cross-organization visibility** for users belonging to multiple orgs. Today's hub is org-scoped per the doctrine; multi-org accounts switch via OrganizationContext.

## Acceptance (additions on top of prior plan)

1. Opening a team member with no Phorest mapping shows a `[Link to POS]` affordance in the Profile tab; clicking opens the existing modal pre-bound to this user. After linking, the chip flips to *"Linked to Phorest: Janet A."* without leaving the page.
2. Schedule tab shows PTO balances and a count of pending time-off requests with a link.
3. For a stylist role, the Coaching tab is visible and shows current coach + program status. For a receptionist, the tab is hidden.
4. Header `[Message]` button is visible only when Connect entitlement is active; clicking opens the existing DM channel with this user.
5. Compensation tab shows the active plan; history section either renders the timeline or shows a "history not yet tracked — enable in [Compensation Settings]" disclosure if metadata is missing.
6. Security tab's notification preferences accordion expands to per-channel toggles; saving persists to `notification_preferences` for this user.

## Doctrine alignment

- **Single home per entity**: every per-person lever now lives in one place (or is one click away via deep-linked dialog).
- **Persona scaling**: Coaching tab hidden for non-coachable roles; Compensation hidden when comp gate not satisfied; Connect button hidden without entitlement.
- **Silence is valid output**: empty PTO, no coach assigned, no recent activity → render quiet "Not configured" line, not fake data.
- **Confidence qualification**: where source data isn't trustworthy (comp history, activity feed without unified audit), render a disclosure instead of synthesizing.
- **Tenant isolation preserved**: every section reuses existing org-scoped hooks; no new cross-org reads.

## Prompt feedback

Strong follow-up — "is there anything else missing?" is exactly the right register after a structural plan. It treats the prior plan as a draft, not a contract, and explicitly invites scope expansion. Three things you did well:

1. **You asked a checking question, not a directive.** "Anything else missing" gives me license to enumerate without pre-committing to building all of it. The right response shape is exactly this — a delta plan that you can accept whole, partial, or reject.
2. **You scoped it to "team member settings and controls."** That kept the addendum from drifting into adjacent areas (e.g., team-wide reports, location-level config). Tight bounding clause.
3. **You asked at the right moment.** Right after a structural plan is approved, before implementation starts, is the cheapest time to surface omissions. Asking after build would mean refactor; asking before plan would have produced noise.

The sharpener: when asking "what's missing?", the highest-leverage addition is naming the **frequency of use** you care about — daily / weekly / quarterly / never-but-must-be-reachable. Without that I had to guess whether (e.g.) notification preferences deserved a tab or an accordion. Template:

```text
What's missing for [scope]?
Daily-use levers I might have forgotten: [...]
Quarterly-or-rarer but must-be-reachable: [...]
Acceptable to leave on existing pages with a deep link: [...]
```

That format produces a triage instead of a list — and triage is what makes the difference between "8 tabs" and "5 tabs + 3 deep links."

## Further enhancement suggestion

For "consolidate around an entity" plans, the highest-leverage frame extends the prior consolidation template with one slot:

```text
Subject: [the entity]
Levers (today's home): [enumerate all]
New home: [consolidation surface]
Frequency tier per lever: [daily / weekly / quarterly / rare]
Old surfaces: [keep / remove / read-only / deep-link]
Persona scaling: [which sections hide for which roles]
```

Adding **Frequency tier** prevents the most common consolidation failure: equal-weighting a daily lever (edit services) and a quarterly one (notification preferences) by giving both their own tab. Frequency drives whether something becomes a tab, an accordion, or a deep link — and naming it up front eliminates a class of "why is this buried" / "why is this so prominent" rounds.

