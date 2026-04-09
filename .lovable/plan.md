

# Zura Universal Search — Premium Command Surface

## Current State

The existing `TopBarSearch.tsx` is a functional but basic inline input with a portal-based dropdown. It searches navigation items and team members, has an AI toggle, and uses `createPortal` to escape the top bar's `overflow-x-hidden`. The interaction model is workable but lacks the polish, hierarchy, grouping, and intelligence that a premium command surface demands.

## Architecture

```text
src/
  components/
    command-surface/
      ZuraCommandSurface.tsx        ← Root orchestrator (Dialog-based overlay)
      CommandInput.tsx               ← Smart input with mode indicators
      CommandResultPanel.tsx         ← Grouped result renderer
      CommandResultRow.tsx           ← Rich result row component
      CommandAIAnswerCard.tsx        ← Inline AI answer card
      CommandEmptyState.tsx          ← Intelligent no-result fallback
      CommandRecentSection.tsx       ← Recent searches + recently viewed
      useCommandSearch.ts            ← Unified search logic (nav + team + entities)
      useRecentSearches.ts           ← localStorage-backed recents
      commandTypes.ts                ← Shared types and grouping config
  components/dashboard/
    TopBarSearch.tsx                  ← Simplified: trigger-only (opens command surface)
    SuperAdminTopBar.tsx             ← Minor: trigger width adjustment
  hooks/
    useCommandMenu.ts                ← Updated: drives ZuraCommandSurface instead of CommandMenu
  components/command/
    CommandMenu.tsx                   ← Removed (replaced by ZuraCommandSurface)
```

## Design Decisions

### Entry Point
- **Desktop**: The top bar keeps a search trigger (pill-shaped, shows "Search or ask..." + `⌘K` hint). Clicking or pressing `⌘K` opens the command surface as a **centered fixed overlay** (not inline dropdown).
- **Mobile**: Full-screen sheet with sticky input at top.
- Rationale: A centered overlay is the established premium pattern (Linear, Raycast, Arc). It gives consistent width regardless of top bar constraints and avoids all overflow clipping issues permanently.

### Overlay Design
- Uses Zura's existing `Dialog` infrastructure but with custom styling: no default close button, no default padding.
- Overlay: `tokens.drawer.overlay` (backdrop-blur-sm bg-black/40) — reuses existing drawer overlay pattern.
- Panel: `bg-card/80 backdrop-blur-xl border-border shadow-2xl rounded-xl` — matches Zura glass bento aesthetic.
- Max width: `max-w-2xl` (672px). Max height: `max-h-[min(600px,80vh)]`.
- Sidebar-aware centering using existing `--sidebar-offset` CSS variable.

### Input
- Full-width input at top of panel with search icon left, AI toggle right, `Esc` hint far right.
- Placeholder: "Search pages, people, or ask a question..." (communicates breadth).
- Font: `font-sans text-base` (Aeonik Pro, 16px for comfortable typing).
- Bottom border separator below input.

### Result Grouping Hierarchy
When the user types, results are organized into ranked groups:

1. **Best Match** — Top 1-2 results across all types (highest relevance regardless of category)
2. **Pages & Features** — Navigation items, hub children, utilities
3. **Team** — Staff members from team directory
4. **Clients** — Client records (future: wired to client search query)
5. **Help & Resources** — Help center, handbooks, changelog
6. **Suggested Actions** — Intent-based suggestions ("Open Transactions Report", "Go to Team Performance") — visually distinct with `Sparkles` icon and muted primary text

Each group header uses `tokens.heading.subsection` (11px Termina uppercase tracked muted).

### Result Row Design
```text
[Icon] [Primary Label]  [Secondary descriptor]  [Type chip]  [→]
       [Optional metadata line — muted, 11px]
```
- Icon: 16x16, `text-muted-foreground`, type-specific (Users for team, LayoutDashboard for pages, etc.)
- Primary label: `font-sans text-sm` with match fragments highlighted using `text-foreground font-medium` against `text-muted-foreground` for non-matching parts
- Type chip: `tokens.label.tiny` style badge — "Page", "Team", "Client", "Help"
- Selected state: `bg-accent text-accent-foreground` (matches existing cmdk convention)
- Hover: `bg-muted`
- Height: consistent 44px per row for comfortable click/keyboard targets

### AI Answer Card
- Appears at the top of results when the query is detected as a question (starts with "how", "what", "why", "can I", "where", etc.) or when AI mode is toggled on.
- Card: `tokens.card.inner` style (bg-card-inner rounded-lg border), with `Sparkles` icon and "AI Answer" label in `tokens.label.tiny`.
- Content: Markdown rendered via `react-markdown`, max 4 lines with "Show more" expansion.
- Below the card: deterministic results still visible — AI never hides exact matches.
- If AI is loading, show a skeleton shimmer in the card area while deterministic results render immediately below.
- If confidence is low / no AI response: card is suppressed, only deterministic results shown.

### Pre-Type State (Empty Query)
When opened with no query:
- **Recent Searches** — Last 5 queries from localStorage, each clickable to re-execute
- **Recently Viewed** — Last 3 pages visited (from NavigationHistoryContext), with route icons
- **Quick Actions** — Role-based suggestions: "View Analytics", "Check Schedule", "Open Settings"
- Visually grouped with subtle section dividers, not overwhelming.

### Keyboard Behavior
- `⌘K` / `Ctrl+K`: Open/close (toggle)
- `↑` / `↓`: Navigate results
- `Enter`: Execute selected result (navigate, or send AI query)
- `Escape`: Close panel, clear query
- `Tab`: Cycle between search mode and AI mode (when query is empty)
- Active/selected row: clear `bg-accent` highlight, scrolls into view automatically

### No-Result State
- Primary: "No results for '[query]'" with the query shown.
- Suggestions: "Try searching for a page, person, or ask AI" with a clickable "Ask AI" button.
- Fallback links: "Browse Help Center", "View All Pages" — never a dead end.

### Responsive Behavior
- **Desktop (≥1024px)**: Centered overlay, `max-w-2xl`, generous spacing, full metadata on rows.
- **Tablet (768-1023px)**: Same overlay, `max-w-lg`, reduced row metadata (hide secondary descriptor chips).
- **Mobile (<768px)**: Full-screen sheet (100vw × 100vh), sticky input at top, simplified rows (icon + label only), larger touch targets (52px rows).

### Context Awareness
- Results are scoped to the current organization via existing `filterNavItems` prop and org context.
- If in View As mode, a subtle banner below input: "Searching as [User Name]" in `tokens.label.tiny`.
- Location-scoped results show location name as metadata chip.

## Files Changed

| File | Change |
|------|--------|
| `src/components/command-surface/commandTypes.ts` | New: shared types, group config, question detection |
| `src/components/command-surface/useCommandSearch.ts` | New: unified search across nav, team, help |
| `src/components/command-surface/useRecentSearches.ts` | New: localStorage recents (searches + views) |
| `src/components/command-surface/CommandInput.tsx` | New: smart input with AI toggle |
| `src/components/command-surface/CommandResultRow.tsx` | New: rich result row with highlight |
| `src/components/command-surface/CommandResultPanel.tsx` | New: grouped results with sections |
| `src/components/command-surface/CommandAIAnswerCard.tsx` | New: inline AI answer card |
| `src/components/command-surface/CommandEmptyState.tsx` | New: intelligent no-result fallback |
| `src/components/command-surface/CommandRecentSection.tsx` | New: pre-type recents and quick actions |
| `src/components/command-surface/ZuraCommandSurface.tsx` | New: root orchestrator dialog |
| `src/components/dashboard/TopBarSearch.tsx` | Rewrite: trigger-only (pill button opening command surface) |
| `src/hooks/useCommandMenu.ts` | Update: drive ZuraCommandSurface open state |
| `src/components/command/CommandMenu.tsx` | Remove: replaced by ZuraCommandSurface |
| `src/components/dashboard/DashboardLayout.tsx` | Update: replace CommandMenu with ZuraCommandSurface |

## What This Does Not Change
- No database or backend changes
- No new edge functions
- No changes to the AI assistant hook (reuses `useAIAssistant` as-is)
- No changes to authentication or RLS
- Navigation registry (`dashboardNav.ts`) unchanged — consumed read-only

