## Plan: Empty-Goals Coach Script + Backfill Verification

Two items in the original list. After investigation, only #1 needs code; #2 is **already resolved by Phase 3.2's read-path fix**. Details below.

---

### Part 1 — Empty-Goals Coach Nudge (build)

**Behavior**

When a stylist viewer opens the dashboard and either:
- has **no `stylist_personal_goals` row at all**, OR
- the row exists but `weekly_target = 0 AND monthly_target = 0`,

AND the account-creation / first-seen marker is **>7 days old**, surface a one-line nudge in the Daily Briefing's existing **"YOU SHOULD DO"** section (or a dedicated coach line above it). The nudge is silent before day 7 — silence is valid output (visibility-contract doctrine).

The nudge is a single line (no checkbox), styled like an existing `shouldDoTask` row, with:
- Icon: `Target` (lucide)
- Copy: `"Set your weekly + monthly sales target — takes 30 seconds."`
- Click → scrolls to the `personal_goals` section on the same page.

**Stylist Privacy Contract compliance**
- Nudge only renders when `roleContext === 'stylist'`.
- Reads only the viewer's own `stylist_personal_goals` row (RLS-scoped).
- No org-wide, peer, or financial data is exposed.
- No coaching the user toward a specific dollar value — Zura must not determine business eligibility/priorities (doctrine: AI Constraints).

**Why >7 days?**
Account-age threshold prevents nagging brand-new stylists during onboarding (alert-fatigue doctrine: real-time alerts reserved for material thresholds). 7 days = full week of dashboard exposure.

---

### Part 2 — Stylist Layout Backfill (no work needed)

**Investigation results**

Database survey across the production database:

```text
dashboard_role_layouts WHERE role IN (stylist, stylist_assistant, booth_renter)  →  0 rows
user_preferences WHERE dashboard_layout IS NOT NULL                              →  1 row (owner only)
```

**Why no backfill is required**

The layout resolution chain in `useDashboardLayout` is:

```text
1. user's saved personal layout       (only allowed for primary owner)
2. dashboard_role_layouts row         (org-authored override)
3. dashboard_layout_templates row     (seeded default)  ← stylists land here
4. hard-coded DEFAULT_LAYOUT
```

Stylists never reach step 1 (`allowPersonalLayout = !!isPrimaryOwner`). With zero stylist rows in step 2, **every stylist read falls through to the template** that Phase 3.1 + 3.2 already reseeded with the new self-scoped sections. There is no stale data to migrate.

**What we'll add instead**

A short note in the contract memory documenting this: "stylist layouts have no per-user override path → reseeding the template is the backfill." This prevents a future operator from writing an unnecessary migration when they see "backfill" in the changelog.

If at any future point an org writes a stylist row into `dashboard_role_layouts` (Owner Layout Editor), that row would override the template. We'll defer the migration until that path actually ships and is used. **Deferral Register entry** added per visibility-contracts doctrine, with revisit trigger: "first non-zero count in `dashboard_role_layouts` where `role IN ('stylist','stylist_assistant','booth_renter')`".

---

### Files

**Modified**
- `src/hooks/useDailyBriefingEngine.ts` — add empty-goals detection (stylist-only), expose `coachNudges: { id, label, action }[]`.
- `src/components/dashboard/DailyBriefingPanel.tsx` — render coach nudges as a new lightweight section above "YOU SHOULD DO".
- `src/__tests__/stylist-privacy-contract.test.ts` — add a smoke test asserting the nudge is gated on `roleContext === 'stylist'`.
- `mem://architecture/stylist-privacy-contract.md` — add Deferral Register row + backfill note.

**No DB migration. No new files.**

---

### Acceptance criteria

- Stylist with no goals row + account age >7d sees the one-line nudge inside Daily Briefing.
- Stylist with non-zero `weekly_target` or `monthly_target` does **not** see the nudge.
- Owner / manager viewers never see the nudge regardless of their goal state.
- Privacy contract test still passes.
- No DB writes triggered by the briefing render.