

# Proactive Search Intelligence — Command Layer Default State

## Audit Summary

**Current empty state** (`CommandRecentSection.tsx`): Shows recent searches (localStorage) and recently viewed pages (decayed frequency map). Falls back to a bare "Search or ask Zura..." message with a ghosted icon. No role awareness, no operational signals, no recommended actions.

**Available data sources already in codebase:**
- `useAIInsights()` — cached AI business insights with `InsightItem[]` (severity, category, priorityScore, impactEstimateNumeric), `ActionItem[]`, and `SuggestedTask[]`. Already used in dashboard cards/drawers. 2hr staleTime, org-scoped.
- `useEffectiveRoles()` — returns current role array respecting view-as mode
- `usePermission()` — `can()`, `canAny()` for permission gating
- `dashboardNav.ts` — full nav registry with `roles[]` and `permission` per item
- `useSearchLearning` — decayed frequency map already drives "Recently Viewed"
- `useEmployeeProfile()` — profile with `is_super_admin`, `location_id`, `location_ids`
- `useViewAs()` — impersonation context
- `PinnableCard` — pinning system exists but pins are per-card visibility, not user favorites

**No existing systems for:** pinned favorites, saved commands, or user-bookmarked destinations. Will not invent one — architect for it cleanly via a future `usePinnedCommands` hook slot.

## Architecture

### New Files (2)

**`src/hooks/useProactiveIntelligence.ts`**
A single hook that composes existing data sources into a prioritized proactive state. Returns:
- `continueItems` — recent searches + recent pages (already computed, repackaged)
- `quickPaths` — role-filtered nav shortcuts from `dashboardNav.ts` registry
- `attentionItems` — top 2-3 AI insights filtered by severity ≥ warning and priorityScore
- `recommendedActions` — top 2-3 action items from AI insights
- `isLoading` — composite loading state

**Logic:**
- Uses `useEffectiveRoles()` to filter nav items by role
- Uses `usePermission().can()` to gate each quick path
- Uses `useAIInsights()` to pull cached insights (no new fetch — reads from TanStack cache with 2hr stale)
- Attention items: filter `insights` where `severity !== 'info'`, sort by `priorityScore` desc, take top 3
- Recommended actions: take top 3 `actionItems` by priority (high > medium > low)
- Quick paths: static role→paths map selecting 4-6 most likely destinations per role archetype
- All data is already org-scoped via existing hooks — no new tenant isolation needed

**Role→Quick Path mapping (static, permission-gated):**
- `receptionist` / `assistant`: Schedule, Client Directory, Waitlist, Appointments & Transactions
- `stylist` / `stylist_assistant`: My Stats, Schedule, Today's Prep, My Pay
- `manager`: Analytics Hub, Operations Hub, Staff Utilization, Schedule
- `admin` / `super_admin`: Analytics Hub, Operations Hub, Roles Hub, Settings, Reports
- Platform roles: handled separately (already have platform nav)

**`src/components/command-surface/CommandProactiveState.tsx`**
Replaces `CommandRecentSection` as the empty-query content. Renders 3-4 compact sections:

1. **Continue** — Recent searches + recently viewed (reuses existing data, same row style as current `CommandRecentSection`)
2. **Quick Paths** — 4-6 role-appropriate nav shortcuts as compact icon+label rows
3. **Attention** — 0-3 operational signals from AI insights, rendered as compact alert rows with severity dot + title + CTA arrow
4. **Suggested** — 0-3 recommended actions as compact action rows

**Visibility rules:**
- Each section only renders if it has items
- Attention section hidden when no warning/critical insights exist (silence is meaningful)
- Suggested section hidden when no action items exist
- If nothing proactive is available, falls back to Continue + Quick Paths only
- If even those are empty, shows the existing "Search or ask Zura..." empty state

### Edited Files (1)

**`src/components/command-surface/ZuraCommandSurface.tsx`**
- Replace `<CommandRecentSection>` with `<CommandProactiveState>` in the `!hasQuery` branch
- Pass through: `recents`, `recentPages`, `onSearchSelect`, `onPageSelect`, `onClearRecents`, `onNavigate` (for quick paths + attention CTAs)

## Visual Design

Each section uses the same row style as existing `CommandRecentSection` — `h-10`, `px-4`, `hover:bg-muted/60`, `transition-colors duration-150`. Section headers use `tokens.heading.subsection`.

**Attention rows** get a subtle severity indicator:
- Warning: `bg-yellow-500/60` dot (w-1.5 h-1.5 rounded-full)
- Critical: `bg-red-500/60` dot
- No colored backgrounds, no alert banners — just a dot + text

**Quick Path rows** use the nav item's icon (`w-4 h-4 text-muted-foreground/40`) matching existing result row patterns.

**Suggested action rows** use a `Zap` icon prefix to distinguish from navigation.

All rows are clickable: quick paths and attention items navigate, suggested actions navigate to relevant report/destination.

## Transition Behavior

When user types first character → `hasQuery` becomes true → proactive state unmounts, search results render. Instant swap, no animation needed (same as current behavior). When user clears query → proactive state remounts with cached data (no loading flash due to TanStack staleTime).

## Performance

- `useAIInsights()` reads from TanStack cache (2hr stale) — no new fetch on command open
- Quick paths are static computation from role + permissions — zero async
- Recent data is already computed in parent — passed as props
- Total new renders: 1 lightweight component with pure props + 1 cached query read

## Responsive

- Desktop: full proactive state with all sections
- Mobile (<768px): show Continue + Quick Paths only (attention/suggested hidden to keep mobile search focused)

## Scope Awareness

- `useAIInsights()` is already org-scoped via `organization_id`
- Nav items already filtered by `useEffectiveRoles()` and `usePermission()`
- View-as mode: `useEffectiveRoles()` already returns impersonated roles, so quick paths adjust automatically

## Fallback Behavior

If AI insights are loading or unavailable: show Continue + Quick Paths only. No skeleton for attention/suggested — they simply don't appear. Never show thin or low-confidence content.

## Files Summary

| File | Action |
|------|--------|
| `src/hooks/useProactiveIntelligence.ts` | Create — compose role-aware quick paths + attention + actions from existing hooks |
| `src/components/command-surface/CommandProactiveState.tsx` | Create — render proactive default state sections |
| `src/components/command-surface/ZuraCommandSurface.tsx` | Edit — swap `CommandRecentSection` → `CommandProactiveState` in empty-query branch |

No database changes. No new design tokens. No new data fetches.

