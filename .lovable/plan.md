

# Zura Search: Command Execution Layer

## Problem

When a user types "sales analytics," the system sometimes triggers AI instructional text instead of immediately returning a direct "Open Analytics Hub → Sales" action. The `navKnowledgeBase` already contains a rich registry of destinations, keywords, and aliases — but it's only used for AI grounding context, not for direct resolution priority. The AI suppression logic (`showAICard`, auto-AI timer, Enter key handler) has low thresholds that let instructional responses leak in when valid navigation targets exist.

## Design Principles

- **Navigation resolution always wins** when a verified destination exists
- **AI is the fallback**, not the default — only activates when no action or destination matches, or for explicitly informational queries ("how do I...", "why is...")
- **Top Result is executable** — prominent action button, Enter-to-open, contextual quick actions
- The existing `navKnowledgeBase.ts` becomes the canonical command registry (it already has 50+ destinations with keywords, tabs, workflows, and role scoping)

## Changes

### 1. Suppress AI when strong navigation results exist

**`ZuraCommandSurface.tsx`** — Three changes:

**a) `showAICard` logic (line ~234)**
Currently fires when `isQuestionQuery(query) && (!hasResults || rankedResults[0]?.score < 0.5)`. Change to only show AI when there are truly no navigation/action results above threshold AND query is informational:

```ts
const showAICard = aiMode || (
  hasQuery &&
  isQuestionQuery(query) &&
  !groundingResult.isNavigation &&
  (!hasResults || rankedResults[0]?.score < 0.35)
);
```

Key addition: `!groundingResult.isNavigation` — if grounding found verified destinations, never auto-show AI.

**b) Auto-AI timer (line ~294-318)**
Add guard: skip auto-AI when `groundingResult.isNavigation` is true or when top result score ≥ 0.3 (currently 0.35, but also needs the grounding guard):

```ts
if (groundingResult.isNavigation && groundingResult.confidence !== 'none') return;
```

**c) Enter key handler (line ~390-399)**
Currently: `if ((aiMode || isQuestionQuery(query)) && query.trim())` — sends to AI even for "sales analytics" because it might match question heuristics. Change to prioritize navigation results:

```ts
} else if (e.key === 'Enter') {
  // Navigation results take priority over AI
  if (flatResults[selectedIndex]?.path) {
    handleSelect(flatResults[selectedIndex]);
  } else if ((aiMode || isQuestionQuery(query)) && query.trim()) {
    // Only fall through to AI when no selectable result exists
    addRecent({ query: query.trim(), resultType: 'help' });
    sendMessage(query, ...);
  } else if (hasQuery && !hasResults && selectedIndex === 0) {
    handleAIFallback();
  }
}
```

### 2. Add prominent action button to dominant Top Result

**`CommandResultRow.tsx`** — When `isDominant` is true, render a prominent primary action button instead of just the small chip:

- Replace the small "Open" chip with a larger, filled primary button: `"Open Sales Analytics"` (dynamic label combining action verb + result title)
- Button uses `bg-primary text-primary-foreground` styling, `font-sans text-xs font-medium`, pill shape
- Only the dominant result gets this treatment; other rows keep existing chips
- The button is always visible (no hover-reveal) for dominant results

### 3. Add contextual quick actions to dominant results

**`CommandResultRow.tsx`** — For dominant navigation results that have tabs in `navKnowledgeBase`, render 1-2 inline quick action links:

- Create a new helper that checks if a result's path matches a `navKnowledgeBase` destination with tabs
- If tabs exist, show up to 2 contextual quick-action chips (e.g., "View This Week" for schedule, "Sales Tab" for analytics)
- These are secondary to the main action button, styled as subtle `text-xs text-muted-foreground` links

This requires passing tab data through. Add an optional `quickActions` field to `RankedResult`:

```ts
export interface QuickAction {
  label: string;
  path: string;
}
```

**`useSearchRanking.ts`** — When building navigation candidates, cross-reference `navKnowledgeBase` to attach `quickActions` for destinations that have tabs.

### 4. Enrich navigation candidates with navKnowledgeBase keywords

**`useSearchRanking.ts`** — Currently nav candidates only have `title` for text matching. Enhance by injecting `searchText` from the knowledge base keywords:

```ts
// In buildNavCandidates, cross-reference NAV_DESTINATIONS
const kbMatch = NAV_DESTINATIONS.find(d => d.path === item.href);
if (kbMatch) {
  candidate.searchText = [item.label, ...kbMatch.keywords].join(' ');
  // Attach quick actions from tabs
  if (kbMatch.tabs) {
    candidate.metadata = kbMatch.tabs.slice(0, 2).map(t => t.label).join(', ');
  }
}
```

This means typing "revenue" will match Analytics Hub (which has "revenue" in its keywords) with high text-match score, preventing AI from activating.

## Files Modified

| File | What |
|------|------|
| `src/components/command-surface/ZuraCommandSurface.tsx` | Fix AI suppression logic, Enter key priority |
| `src/components/command-surface/CommandResultRow.tsx` | Prominent action button for dominant results, quick actions |
| `src/hooks/useSearchRanking.ts` | Inject navKnowledgeBase keywords into searchText, attach quickActions |
| `src/lib/searchRanker.ts` | Add `quickActions` field to `RankedResult` and `SearchCandidate` types |

## What This Does NOT Change

- The `navKnowledgeBase.ts` registry — already comprehensive, no additions needed
- The AI grounding pipeline — still used when AI does activate
- The ranking algorithm weights — the fix is about text coverage (keywords) and AI suppression thresholds, not re-weighting
- Action registry (`actionRegistry.ts`) — still handles workflow actions (book appointment, etc.)

