

# Command Surface UX Overhaul — From Menu to Command Center

## Summary

The architecture is strong. The issue is **presentation and framing**. The engine has 5 search layers, action execution, grounded AI, and keyboard-first flow — but the UI presents it like a passive suggestion panel. This overhaul reframes the visual hierarchy, section naming, result differentiation, and default state to feel like an operating system command layer.

## Changes

### 1. Rename Sections (CommandProactiveState.tsx)

| Current | New |
|---------|-----|
| Continue | Recent |
| Quick Paths | Navigate |
| Suggested | Actions |

### 2. Reorder Default State (CommandProactiveState.tsx)

Current order: Today → Continue → Quick Paths → Attention → Suggested

New order:
1. **Actions** (recommended actions — moved to top, these are execution, not suggestions)
2. **Today** (today's schedule, tasks, revenue)
3. **Recent** (previous searches/pages)
4. **Navigate** (quick paths)
5. **Needs Attention** (alerts)

This puts execution first.

### 3. Top Result Visual Treatment (CommandResultPanel.tsx + CommandResultRow.tsx)

The "Top Results" group already exists (`best` group in `groupRankedResults`). The issue is that Top Results rows look identical to every other row.

Changes to `CommandResultRow.tsx`:
- Accept an `isTopResult` prop
- When true: increase row height to `h-14`, make title `text-foreground` instead of muted, add subtle left accent bar (`border-l-2 border-primary/40`), and show subtitle inline instead of hidden
- This creates immediate visual anchoring without redesigning the whole row

Changes to `CommandResultPanel.tsx`:
- Pass `isTopResult={group.id === 'best'}` to rows in the "best" group

### 4. AI Mode → Adaptive (ZuraCommandSurface.tsx)

Remove the explicit AI toggle requirement for question queries. The auto-AI trigger already exists (line 250-274) but fires after a 1200ms delay and only when score < 0.35.

Changes:
- Keep the Tab toggle for manual override, but change the footer label from "AI mode" to "ask Zura"
- When `isQuestionQuery(query)` is true and results exist, show a subtle "Ask Zura" row at the bottom of results (not a mode switch) — this makes AI feel integrated, not bolted on
- Reduce auto-AI delay from 1200ms to 800ms for questions with no results

### 5. Inline Action Chips on Top Results (CommandResultRow.tsx)

For top results where `type === 'navigation'` or `type === 'action'`, show small action chips on hover/selection:
- Navigation results: `[Open]` chip (already implicit via Enter, but making it visible)
- Action results: `[Run]` chip
- These are purely visual affordances — clicking the row already works

Implementation: Add a small `<span>` chip that appears on hover/selected state, right-aligned before the chevron.

### 6. Smarter Empty/Default State (CommandProactiveState.tsx)

When there are no recents AND no quick paths AND no attention items:
- Instead of "Search or ask Zura...", show:
  - Today's Schedule (always)
  - "Create Appointment" action
  - "Add Client" action  
  - "Run Report" action
- This makes the empty state feel alive and actionable

### 7. Group Label for Help Results (CommandResultPanel.tsx)

The `GROUP_CONFIG` already labels help as "Help & Resources". But when `isQuestionQuery` is true and results include both navigation and help types, the help results should be labeled "Learn" instead. This is a minor label override in `CommandResultPanel` when the query is a question.

### 8. Footer Bar Update (ZuraCommandSurface.tsx)

Change:
- `Tab → AI mode` → `Tab → ask Zura`
- Add `⌘↵ → run action` hint when an action is detected

## Files Changed

| File | Changes |
|------|---------|
| `src/components/command-surface/CommandProactiveState.tsx` | Rename sections, reorder to Actions → Today → Recent → Navigate → Attention |
| `src/components/command-surface/CommandResultRow.tsx` | Add `isTopResult` prop with enhanced visual treatment, add hover action chip |
| `src/components/command-surface/CommandResultPanel.tsx` | Pass `isTopResult` to best-group rows |
| `src/components/command-surface/ZuraCommandSurface.tsx` | Update footer labels, reduce auto-AI delay |

## What This Does NOT Change

- Search ranking engine (already correct)
- Grounding system (already retrieval-first)
- Action execution flow (already working)
- Keyboard navigation (already complete)
- Entity search (just added in prior round)
- Visual positioning/anchoring (already correct)

