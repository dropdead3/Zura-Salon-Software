

# Zura Command Surface — Authority & Execution Overhaul

## Summary

Transform the command surface from a passive search panel into an authoritative command center. The changes span visual hierarchy, section naming, contextual intelligence, and adaptive AI integration.

## Changes

### 1. `CommandProactiveState.tsx` — Contextual Empty State

Restructure the empty state (no query) into a living command center:

- **Actions** section stays at top — add more role-aware actions (e.g., "Open Roles & Permissions", "Create Report", "Invite Team Member", "View Today's Appointments") pulled from the existing `useProactiveIntelligence` hook + new static action candidates
- **Today** section: Show contextual signals — time-aware (morning/afternoon greeting), show appointment count, revenue snapshot if available, underbooked staff count. Pull from existing hooks (`useAIInsights`, `useTodayActualRevenue`)
- **Recent** section (already renamed from "Continue"): Keep as-is — already correctly labeled
- **Navigate** section: Keep as-is — already correctly labeled from "Quick Paths"
- **Needs Attention**: Stays — already good

Visual changes:
- Action rows get subtle primary tint on icon instead of muted gray
- "Today" section items show live counts as right-aligned badges (e.g., "6 appointments", "$1,245")

### 2. `CommandResultRow.tsx` — Visual Type Differentiation

Make result types instantly distinguishable:

- **Actions**: Left border `border-l-2 border-primary/40` (currently only on top results), icon gets `text-primary/70` tint, chip label always visible (not just on hover)
- **Navigation**: Default style — clean, no accent
- **Entities** (client/team/inventory): Subtle `bg-muted/20` background tint to visually separate from navigation
- **Help/Learn**: Icon uses ZuraZ icon instead of generic, slight italic on subtitle
- Remove the type `Badge` on the right side — it's visual noise. The differentiation comes from styling, not labels. Replace with subtle text-only type hint that appears only on hover

### 3. `CommandResultPanel.tsx` — Top Result Anchoring

Strengthen the "Best Match" group:

- Top result row gets: larger height (`h-16` vs `h-14`), slightly brighter title (`text-foreground` always), subtle `bg-accent/30` background, and the action chip always visible
- Add a small "Best Match" label above the top result section with a subtle glow/highlight line
- Second result in "Best Match" remains `h-14` — only the first gets the dominant treatment
- Rename group label from "Best Match" to "Top Result" when only 1 result, keep "Best Match" when 2+

### 4. `CommandResultRow.tsx` — Inline Action Chips for All Results

Extend action chips beyond just top results:

- All `action` type results: show "Run" chip always
- All `navigation` type results: show "Open" chip on hover/selected
- Entity results: show "View" chip on hover/selected
- Help results: show "Learn" chip on hover/selected
- Chips use type-specific colors: actions=primary, navigation=muted, entities=blue-ish, help=purple-ish

### 5. `CommandInput.tsx` — Remove AI Toggle Button

Remove the explicit "Z AI" toggle button from the input bar. AI mode becomes adaptive:

- Remove the button entirely
- When query matches question patterns (`how`, `what`, `why`, etc.), auto-route to AI (already partially implemented via `autoAiTimerRef` in `ZuraCommandSurface.tsx`)
- Keep `Tab` keyboard shortcut for power users to force AI mode when query is empty
- Update placeholder text: "Search, run actions, or ask a question..."

### 6. `ZuraCommandSurface.tsx` — Footer Polish

- Replace "ask Zura" keyboard hint with "AI" (shorter, cleaner)
- Add "⌘↵ run" hint when action-type results exist (not just when action panel is active)
- On mobile: only show "↵ open" and result count

### 7. `CommandSearchFilters.tsx` — Scope Filter Refinement

- Reorder: All → Actions → Pages → People → Clients → Inventory → Tasks → Appointments
- Actions moved to position 2 (was position 4) to emphasize execution

### 8. Section Label Mapping (already done in proactive state, ensure consistency in result groups)

Ensure `CommandResultPanel` and `commandTypes.ts` use these labels:
- `best` → "Top Result" (1 result) / "Top Results" (2+)
- `action` → "Actions"
- `navigation` → "Navigate"
- `team` → "People"
- `client` → "Clients"
- `help` → "Learn" (already done for question queries, make permanent)
- `insight` → "Insights"

## Files Changed

| File | Change |
|------|--------|
| `src/components/command-surface/CommandProactiveState.tsx` | Contextual empty state with live data, more actions |
| `src/components/command-surface/CommandResultRow.tsx` | Type-specific visual differentiation, inline action chips for all types, remove Badge |
| `src/components/command-surface/CommandResultPanel.tsx` | Stronger top result anchoring, dynamic label |
| `src/components/command-surface/CommandInput.tsx` | Remove AI toggle button, update placeholder |
| `src/components/command-surface/CommandSearchFilters.tsx` | Reorder scopes: Actions to position 2 |
| `src/components/command-surface/ZuraCommandSurface.tsx` | Footer hint refinements, mobile cleanup |
| `src/components/command-surface/commandTypes.ts` | Update GROUP_ORDER labels: "Pages & Features" → "Navigate", "Help & Resources" → "Learn" |

## What This Does NOT Change

- Ranking engine (`searchRanker.ts`) — scores and grouping logic stay the same
- AI answer card — already has dismiss button, rounded-lg, grounded navigation
- Preview panel — stays as-is
- Chain bar — stays as-is
- Analytics inline card — stays as-is (already shows real data)
- Action execution panel — stays as-is

## Design Principles Applied

- Execution over discovery: action chips visible, action scope prominent
- Authority: top result anchoring reduces scanning
- Adaptive AI: no manual toggle, question detection routes automatically
- Contextual: empty state shows live signals, not static menus
- Calm confidence: subtle differentiation through tint, not loud badges

