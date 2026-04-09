

# Zura Command Surface — Evolution to Operating System Command Layer

## Current State Assessment

The existing system already has strong bones across all 5 requested layers:

| Layer | Status | Gap |
|-------|--------|-----|
| Navigation search | Strong — synonyms, knowledge base, grounding | No entity search for inventory, appointments, tasks, formulas, documents |
| Entity search | Team members only | Missing: clients, appointments, inventory, tasks, formulas, messages, documents |
| Action search | Action registry with detect/confirm/execute | Limited action set — needs expansion |
| Help search | Grounded AI with nav knowledge base | Already retrieval-first; working as designed |
| Data/insight search | Basic pattern hints (retail/revenue/rebooking) | No real data queries or business intelligence answers |

The visual anchoring from the search pill is already implemented (anchorRef, panelTop/panelLeft measurement). The positioning already grows from the pill downward. Keyboard-first flow (⌘K, arrows, Enter, Esc, Tab) exists.

## What Needs Building

### Phase 1: Entity Search Layer (highest impact gap)

**Problem**: Typing "Sarah" only matches team directory. It should also search clients, recent appointments, tasks, inventory items, and formulas.

**Changes**:
- **`src/hooks/useSearchRanking.ts`**: Add candidate builders for clients, inventory, and tasks using existing hooks (`useClientDirectory` or similar, `useInventoryItems`, `useTasks`)
- **`src/lib/searchRanker.ts`**: Add result types `'inventory'`, `'appointment'`, `'task'`, `'formula'` to `RankedResultType`
- **`src/components/command-surface/CommandResultRow.tsx`**: Add type labels and icons for new entity types
- **`src/components/command-surface/commandTypes.ts`**: Extend `GROUP_ORDER` with new entity groups

Entity candidates should be lazy-loaded (only fetched when the command surface is open) and limited to recent/relevant records to keep performance tight.

### Phase 2: Expand Action Registry

**Problem**: Limited actions available. Users should be able to type "create appointment", "assign task", "start chat", "adjust inventory", "open checkout", "create formula".

**Changes**:
- **`src/lib/actionRegistry.ts`**: Add ~10 new action definitions with route builders and input schemas
- Actions to add: `create_appointment`, `start_chat`, `adjust_inventory`, `open_checkout`, `create_formula`, `view_no_shows`, `reorder_inventory`, `assign_task`, `schedule_meeting`

### Phase 3: Enhanced Data/Insight Search

**Problem**: Typing "why is retail down?" or "which stylists are underbooked?" gets no inline intelligence.

**Changes**:
- **`src/components/command-surface/CommandInlineAnalyticsCard.tsx`**: Expand pattern matching to cover utilization, underbooking, waste, client retention, payroll, and inventory queries
- Add more `ANALYTICS_PATTERNS` entries mapping to specific analytics hub tabs/paths
- For deeper questions, the existing AI fallback (grounded) handles this adequately — the improvement is making the deterministic hint layer broader

### Phase 4: Search Result Grouping and Type Clarity

**Problem**: Results don't clearly indicate whether something is a page, record, action, help answer, or insight.

**Changes**:
- **`src/components/command-surface/CommandResultRow.tsx`**: Add distinct type icons per category (page icon, person icon, action bolt, help book, chart icon)
- **`src/components/command-surface/CommandResultPanel.tsx`**: Reorder groups to follow the requested priority: Top Match → Actions → Navigation → People → Clients → Appointments → Inventory → Tasks → Help → Insights
- **`src/lib/searchRanker.ts`**: Update `groupRankedResults` to use the new priority ordering

### Phase 5: Premium Empty/Default States

**Problem**: The proactive state is functional but not "alive" enough. Missing: pinned commands, smart contextual suggestions based on current page, inline previews for entities.

**Changes**:
- **`src/components/command-surface/CommandProactiveState.tsx`**: Add "Today" quick-access row (today's schedule, today's tasks, today's revenue) triggered by typing "today"
- Add contextual suggestions based on current page (if on schedule, suggest "today's color appointments"; if on analytics, suggest "revenue this month")
- **`src/components/command-surface/CommandSearchFilters.tsx`**: Add scope chips for new entity types (clients, inventory, tasks)

### Phase 6: Permission-Aware Result Filtering

**Problem**: Results should respect permissions before rendering. Locked actions should not appear unless intentionally designed as locked preview states.

**Changes**:
- **`src/lib/searchRanker.ts`**: `computeRoleRelevance` already filters by role (returns 0 for unauthorized). Verify this suppresses results entirely (score 0 → filtered out pre-grouping) rather than showing them grayed
- Add a minimum score threshold in `groupRankedResults` to exclude 0-score items

## Files Changed

| File | Change |
|------|--------|
| `src/lib/searchRanker.ts` | New result types, updated group ordering, permission filtering |
| `src/hooks/useSearchRanking.ts` | New entity candidate builders (clients, inventory, tasks) |
| `src/lib/actionRegistry.ts` | ~10 new action definitions |
| `src/components/command-surface/CommandResultRow.tsx` | Type-specific icons, new type labels |
| `src/components/command-surface/CommandResultPanel.tsx` | Group priority reordering |
| `src/components/command-surface/commandTypes.ts` | New result types and group config |
| `src/components/command-surface/CommandInlineAnalyticsCard.tsx` | Expanded analytics pattern matching |
| `src/components/command-surface/CommandSearchFilters.tsx` | New scope chips |
| `src/components/command-surface/CommandProactiveState.tsx` | "Today" shortcuts, contextual suggestions |

## What This Does NOT Change

- Visual positioning (already anchored to pill, already grows downward)
- Keyboard navigation (already complete: ⌘K, arrows, Enter, Esc, Tab)
- Help grounding system (already retrieval-first with verified knowledge base)
- AI fallback behavior (already grounded with 6 hard rules)
- Preview panel (already exists)
- Recent searches and learning (already exists)
- Typeahead completion (already exists)
- Chain query engine (already exists)

## Build Order

1. Entity search layer (clients, inventory, tasks) — largest user-facing gap
2. Result grouping and type clarity — makes results scannable
3. Action registry expansion — makes search actionable
4. Analytics hint expansion — broader deterministic intelligence
5. Premium states — polish layer
6. Permission filtering hardening — safety layer

## Technical Notes

- Entity candidates (clients, inventory) should use existing data hooks with `enabled: !!open` to avoid unnecessary queries when the command surface is closed
- Client search should support fuzzy matching on name, phone, and email
- Inventory search should match product name, SKU, and brand
- All new candidates follow the existing `SearchCandidate` interface — no schema changes needed
- No database changes required — all data comes from existing hooks/tables

