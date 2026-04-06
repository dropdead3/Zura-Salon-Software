

# Surface Level Progression Status on Team Directory Cards

## Current State

Level promotion/demotion readiness currently surfaces in **three places**, none of which are the Team Directory:

1. **Graduation Tracker** (`/dashboard/admin/graduation-tracker`) — dedicated page with tabs for Ready, In Progress, At Risk, etc.
2. **Level Readiness Card** (Analytics Hub) — summary card showing "Ready to Promote" and "Stalled Progression" lists
3. **Staff Level Report PDF** — downloadable from the Level Roadmap settings page

The **Team Directory** (`/dashboard/directory`) shows each staff member's current level badge (e.g., "Level 2") but gives zero indication of whether they're ready for promotion, at risk of demotion, or stalled.

## What Changes

Add a compact **level status indicator** to each `TeamMemberCard` in the Team Directory, visible only to super admins. This indicator sits next to the existing level badge and communicates:

- **Ready to Promote** — green upward arrow + tooltip with composite score and recommended next level
- **At Risk / Below Standard** — amber/red downward arrow + tooltip with retention failure details
- **Stalled** — gray clock icon + tooltip showing time at level (when progression has flatlined 6+ months)
- **In Progress / No flags** — no indicator shown (keeps cards clean for the majority)

Only stylists/assistants with an assigned level get this treatment. Non-stylist roles are unaffected.

## Architecture

```text
TeamDirectory.tsx
  └── useTeamLevelProgress()  ← already exists, used by GraduationTracker
       └── returns TeamMemberProgress[] with status, compositeScore, nextLevel, retentionFailures
  └── TeamMemberCard
       └── NEW: LevelStatusIndicator (inline, next to existing level badge)
            - Tooltip with details
            - Click navigates to Graduation Tracker filtered to that user
```

## Data Flow

- `useTeamLevelProgress()` is called once at the `TeamDirectory` page level (only when user is super admin)
- A `Map<userId, TeamMemberProgress>` is built and passed down to each card
- No new database queries — the hook already fetches all active stylists with levels
- The hook is behind `enabled: !!orgId`, so it won't fire for non-authenticated users

## Visual Design

The indicator appears inline with the existing level badge row (line ~869-879 of TeamDirectory.tsx):

```text
┌──────────────────────────────────────┐
│  👤 Avatar    Name                   │
│              ⏱ 2y 3m  📍 2  [Lvl 2] ▲ Ready  │
│              (555) 123-4567          │
│              ✉ 📸                    │
│  ─────────────────────────────────── │
│  Extensions · Blonding · Color      │
└──────────────────────────────────────┘
```

- `▲ Ready` — small emerald pill with upward chevron, tooltip: "Composite: 94% · Recommended: Level 3"
- `▼ At Risk` — small rose pill with downward chevron, tooltip: "Revenue below minimum · Grace period active"
- `⏸ Stalled` — small muted pill, tooltip: "No progression in 8 months"

Uses existing `getLevelColor` for consistency. Icons from Lucide (`TrendingUp`, `TrendingDown`, `Pause`).

## Files

| File | Action |
|------|--------|
| `src/pages/dashboard/TeamDirectory.tsx` | Import `useTeamLevelProgress`, build user→progress map, pass to `TeamMemberCard`, render `LevelStatusIndicator` inline next to level badge |

Single file change. No new components needed (indicator is ~20 lines inline). No database changes.

## Scope Guard
- Only renders for super admins (gated by existing `isSuperAdmin` prop)
- Only for stylists/assistants with assigned levels (existing `isStylistOrAssistant` check)
- Silent for "in progress" / "no criteria" / "at top level" statuses — only surfaces actionable flags

