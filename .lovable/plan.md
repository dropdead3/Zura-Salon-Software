

# Zura Command Surface — Full Audit Report

## Bugs Found

### 1. `classifyAndGround` called 3x redundantly on every render (Performance Bug)
**File**: `ZuraCommandSurface.tsx` lines 483-485
```
isNavQuestion={isQuestionQuery(query) && classifyAndGround(query, primaryRole).isNavigation}
navConfidence={classifyAndGround(query, primaryRole).confidence}
```
These call `classifyAndGround` **inline in JSX** on every render — twice just for the AI card props, plus once more in auto-trigger and once in `handleAIFallback`. Should be memoized with `useMemo`.

### 2. Scope filter map missing new entity types (Functional Bug)
**File**: `ZuraCommandSurface.tsx` lines 155-161
The `scopeTypeMap` only has entries for `navigation`, `team`, and `action`. The new scopes `client`, `inventory`, and `task` are in the filter chips but have no mapping — selecting them filters to **zero results**.
```typescript
const scopeTypeMap: Record<string, string[]> = {
  navigation: ['navigation', 'help'],
  team: ['team'],
  action: ['action'],
  // MISSING: client, inventory, task
};
```

### 3. "Today" shortcuts section was never added (Missing Feature)
**File**: `CommandProactiveState.tsx`
The plan called for a "Today" section (Today's Schedule, Today's Tasks, Today's Revenue) but it was never wired into the component. The imports for `Calendar`, `CheckSquare`, `TrendingUp`, `Package` are present but unused.

### 4. `useTasks` fires on every command surface open, even when not searching (Performance)
**File**: `useSearchRanking.ts` line 141
`useTasks()` runs unconditionally — fetches all user tasks from the database every time the hook runs. There's no `enabled` guard tied to whether the command surface is open.

### 5. Action candidates missing `path` property (Navigation Bug)
**File**: `useSearchRanking.ts` lines 198-207
Action candidates built from the registry have no `path` field. When a user selects an action result from search, `handleSelect` checks `result.path` — if missing, nothing happens and the click is silently swallowed.

### 6. `getNextActions` missing entries for new actions (Incomplete)
**File**: `actionRegistry.ts` lines 351-373
Only `create_client`, `book_appointment`, `send_message`, and `check_in` have next-action definitions. The 9 new actions (`create_appointment`, `start_chat`, `adjust_inventory`, etc.) all fall through to `default: return []`.

### 7. Duplicate action semantics: `book_appointment` vs `create_appointment` (Confusion)
**File**: `actionRegistry.ts`
Both do essentially the same thing (schedule an appointment) with nearly identical fields. Both require `create_appointments` permission. `book_appointment` routes to `?action=book` and `create_appointment` routes to `?action=new`. This will produce duplicate results when searching "appointment".

### 8. `send_message` vs `start_chat` — duplicate actions (Confusion)
Same pattern: both route to `/dashboard/team-chat?to={recipient}`. `send_message` requires `team_chat.send` permission; `start_chat` requires none. A user searching "chat" or "message" will get two near-identical results.

### 9. `useEffect` dependency array missing `primaryRole` (Stale Closure)
**File**: `ZuraCommandSurface.tsx` line 266
The auto-AI trigger effect uses `primaryRole` inside the timeout but doesn't include it in deps. If the role changes mid-session, the stale role is used.

### 10. `addRecent` called with wrong shape in Enter handler (Type Bug)
**File**: `ZuraCommandSurface.tsx` line 324
```typescript
addRecent(query.trim());  // passes string
```
But on line 287:
```typescript
addRecent({ query: query.trim(), selectedPath: result.path, ... }); // passes object
```
The `addRecent` function likely accepts both forms, but the string form loses the `resultType: 'help'` metadata that the auto-AI trigger (line 257) correctly provides.

### 11. No `permissions` field on action candidates (Search field mismatch)
**File**: `useSearchRanking.ts` line 206
```typescript
permissions: action.permissions[0] ? action.permissions[0] : undefined,
```
The `SearchCandidate` type has `permission` (singular), but this sets `permissions` (plural) — the field is silently ignored, meaning permission-gated actions appear for all users.

## Gaps Found

### 12. No client search candidates
The plan called for client entity search (search by name, phone, email). No client data hook is wired into `useSearchRanking.ts`. Typing a client name will only match team directory, not the client database.

### 13. No inventory search candidates
Same gap — no inventory data is fetched or indexed. The `inventory` scope chip exists but returns zero results.

### 14. No appointment search candidates
No appointment data is fetched for search. Typing "today's appointments" finds no entity-level results.

### 15. Analytics card is static — no real data shown
`CommandInlineAnalyticsCard` always shows "View detailed analytics" with no actual data preview (revenue number, sparkline). The `AnimatedBlurredAmount` and `TrendSparkline` are imported but unused.

---

## Fix Plan

### Fix 1: Memoize `classifyAndGround` (ZuraCommandSurface.tsx)
Add a `useMemo` that computes `{ isNavQuestion, navConfidence }` once per `query + primaryRole` change, instead of calling inline 3x.

### Fix 2: Complete scope filter map (ZuraCommandSurface.tsx)
Add missing entries: `client: ['client']`, `inventory: ['inventory']`, `task: ['task']`.

### Fix 3: Add "Today" section to ProactiveState (CommandProactiveState.tsx)
Wire the already-imported icons into a Today shortcuts section at the top of the proactive state.

### Fix 4: Fix action candidate `permission` field name (useSearchRanking.ts)
Change `permissions:` to `permission:` (singular) to match the `SearchCandidate` interface.

### Fix 5: Add `path` to action candidates (useSearchRanking.ts)
Build path from `action.routeTemplate` (with placeholder keys left as-is) so that action results are navigable.

### Fix 6: Add `getNextActions` entries for new actions (actionRegistry.ts)
Add follow-up actions for `create_appointment`, `start_chat`, `adjust_inventory`, `assign_task`, `reorder_inventory`, `view_no_shows`.

### Fix 7: Deduplicate `book_appointment`/`create_appointment` and `send_message`/`start_chat` (actionRegistry.ts)
Remove `create_appointment` (keep `book_appointment`) and remove `start_chat` (keep `send_message` but relax its permission to `[]`).

### Fix 8: Add `primaryRole` and `orgId` to auto-AI effect deps (ZuraCommandSurface.tsx)
Fix stale closure bug.

### Fix 9: Fix `addRecent` call in Enter handler (ZuraCommandSurface.tsx)
Change to `addRecent({ query: query.trim(), resultType: 'help' })` for consistency.

### Files Changed

| File | Fixes |
|------|-------|
| `src/components/command-surface/ZuraCommandSurface.tsx` | #1, #2, #8, #9 |
| `src/hooks/useSearchRanking.ts` | #4 (add note — not blocking), #5 |
| `src/lib/actionRegistry.ts` | #6, #7 |
| `src/components/command-surface/CommandProactiveState.tsx` | #3 |

### Not in scope (future work)
- Client, inventory, appointment entity search (#12, #13, #14) — requires new data hooks and candidate builders. Large feature, separate pass.
- Analytics card live data (#15) — requires wiring real-time analytics queries. Separate feature.

