

# Search System Improvements — 4 Enhancements

## Overview

Four improvements to the Zura command surface: structured search history, typeahead ghost-text, fuzzy matching integration into `scoreMatch`, and scoped search filters. Voice input excluded per request.

## Current State

- **Search history**: `useRecentSearches` stores raw query strings in localStorage. No record of what the user actually selected, when, or what type of result it was.
- **Typeahead**: None. Input is plain text with no completion hints.
- **Fuzzy matching**: Levenshtein-based `findNearMatch` already exists in `synonymRegistry.ts` and runs during `expandQuery` — but only against the synonym vocabulary list (~200 terms). The core `scoreMatch` in `textMatch.ts` is strictly prefix/substring. Nav labels, team names, and help items that aren't in the synonym vocabulary get zero fuzzy tolerance.
- **Scoped filters**: None. All result types (nav, team, help, actions) are mixed together.
- **Dead code**: `useCommandSearch.ts` has a duplicate `scoreMatch` and is never imported — should be deleted.

---

## Enhancement 1: Structured Search History

**Problem**: `useRecentSearches` stores `string[]`. We don't know what the user selected, so we can't show "You went to Schedule" or boost re-selections.

**Changes**:

| File | Action |
|------|--------|
| `src/components/command-surface/useRecentSearches.ts` | Rewrite — store `RecentSearch[]` with `{ query, selectedPath, selectedTitle, resultType, timestamp }`. Migrate existing raw strings on first read. Keep backward compat for `recents` as `string[]` getter. Add `recentSelections` getter for richer display. |
| `src/components/command-surface/ZuraCommandSurface.tsx` | Edit `handleSelect` — call `addRecent` with structured object instead of raw query string |
| `src/components/command-surface/CommandProactiveState.tsx` | Edit "Continue" section — show "You went to [title]" with icon instead of raw query text for recent selections that have a `selectedTitle` |

---

## Enhancement 2: Typeahead Ghost-Text Autocomplete

**Problem**: No input completion. Users type full words when the system already knows the vocabulary.

**Approach**: Add a ghost-text completion layer to `CommandInput`. When the user types ≥2 chars, find the best-matching nav label, team name, or recent query that starts with the current input. Render the completion as a transparent overlay behind the input text. Tab accepts the completion.

**Changes**:

| File | Action |
|------|--------|
| `src/hooks/useTypeahead.ts` | Create — hook that takes `query`, nav labels, team names, recent queries → returns `completion: string \| null`. Uses prefix matching against a pre-built vocabulary. Debounced to avoid jank. |
| `src/components/command-surface/CommandInput.tsx` | Edit — accept `completion` prop. Render ghost text as an absolutely-positioned span behind the input (same font, `text-muted-foreground/30`). Handle Tab key to accept completion. |
| `src/components/command-surface/ZuraCommandSurface.tsx` | Edit — call `useTypeahead` with query + nav labels + team names, pass `completion` to `CommandInput` |

**Ghost-text rendering**: Position a `<span>` behind the input with `pointer-events-none`, matching font size/family. Content = `query + remainingCompletion`. Only the remaining part after the query is visible (query portion is transparent). Tab replaces query with full completion.

---

## Enhancement 3: Fuzzy Matching in Core `scoreMatch`

**Problem**: `findNearMatch` only checks against the synonym vocabulary. If a user types "Performnce Reviews" (typo), the synonym system may not catch it because "Performance Reviews" is a nav label, not a synonym term. `scoreMatch` returns 0 for anything that isn't a prefix/substring match.

**Approach**: Add a Levenshtein fallback to `scoreMatch` in `textMatch.ts`. When substring matching returns 0, check edit distance. For short queries (≤8 chars), allow distance 1. For longer queries, allow distance 2. Score discounted to 30–40 range (below substring matches but above zero).

**Changes**:

| File | Action |
|------|--------|
| `src/lib/textMatch.ts` | Edit `scoreMatch` — add Levenshtein fallback after word-boundary check returns 0. Import or inline a minimal Levenshtein function (same implementation from `synonymRegistry.ts`, extracted to shared). Also add word-level fuzzy: split haystack into words, check if any word is within edit distance 1-2 of query. |
| `src/lib/synonymRegistry.ts` | Edit — export the existing `levenshtein` function (currently private). Or extract to `textMatch.ts` and import from there. |
| `src/components/command-surface/useCommandSearch.ts` | Delete — dead code, never imported. Has duplicate `scoreMatch`. |

---

## Enhancement 4: Scoped Search Filter Chips

**Problem**: All result types are mixed. Power users can't narrow to "just pages" or "just team members."

**Approach**: Add filter chips below the input (Pages, Team, Actions, All). Also support prefix syntax: `@sarah` → team scope, `/schedule` → pages scope. Chips are optional — the default "All" shows everything.

**Changes**:

| File | Action |
|------|--------|
| `src/components/command-surface/CommandSearchFilters.tsx` | Create — row of filter chips: All, Pages, Team, Actions. Styled as small pills matching the AI toggle style. Active chip uses `bg-muted text-foreground`. |
| `src/components/command-surface/CommandInput.tsx` | Edit — detect prefix syntax (`@`, `/`) on input change, emit `onScopeChange` callback |
| `src/components/command-surface/ZuraCommandSurface.tsx` | Edit — add `activeScope` state. Pass to ranking. Render `CommandSearchFilters` between input and results. Filter `flatResults` by scope before rendering. |
| `src/hooks/useSearchRanking.ts` | Edit — accept optional `scope` parameter. When set, filter candidates before ranking (e.g., scope='team' → only team candidates). |

**Filter chip design**: `h-6 px-2.5 rounded-full text-xs font-sans font-medium` — same density as the AI toggle pill. Row sits in a `px-5 py-1.5 border-b border-border/30` container below the input. Only visible when query is non-empty (no chips in empty state).

---

## File Summary

| File | Action |
|------|--------|
| `src/components/command-surface/useRecentSearches.ts` | Rewrite — structured history |
| `src/hooks/useTypeahead.ts` | Create — ghost-text completion hook |
| `src/components/command-surface/CommandInput.tsx` | Edit — ghost text + scope prefix detection |
| `src/components/command-surface/CommandSearchFilters.tsx` | Create — filter chip row |
| `src/components/command-surface/ZuraCommandSurface.tsx` | Edit — wire typeahead, structured recents, scope filters |
| `src/components/command-surface/CommandProactiveState.tsx` | Edit — richer recent display |
| `src/lib/textMatch.ts` | Edit — add fuzzy fallback to `scoreMatch` |
| `src/lib/synonymRegistry.ts` | Edit — export `levenshtein` |
| `src/hooks/useSearchRanking.ts` | Edit — accept scope filter |
| `src/components/command-surface/useCommandSearch.ts` | Delete — dead code |

No database changes. No new dependencies (framer-motion already present). No design token changes.

## Technical Notes

- **Ghost-text performance**: `useTypeahead` pre-builds a sorted vocabulary array once (nav labels + team names + recent queries). Binary search for prefix match. No re-render on every keystroke — only when completion changes.
- **Fuzzy scoring**: Levenshtein is O(m×n) but with the existing early-exit optimization (length diff > 2 → return 3), it's fast for the ~100 candidates in the search pool.
- **Scope filters**: Applied as a pre-filter on the candidate pool before ranking, not as a post-filter on results. This ensures ranking scores remain meaningful within the filtered set.
- **Structured history migration**: On first read, existing raw `string[]` entries are converted to `RecentSearch` objects with `query` only (no `selectedPath`). No data loss.

