

# Zura Command Surface — Polish & Bug Fix Pass

## Issues Found

### Bugs
1. **Ghost text misalignment**: `CommandInput.tsx` line 68 — the ghost overlay uses `absolute top-0 left-0` but the input has no explicit height/line-height coordination. On some font renders the ghost text sits slightly above/below the typed text. Needs matching `leading` and vertical alignment.

2. **Tab key conflict**: When query is empty and user presses Tab, line 366–369 toggles AI mode. But `CommandInput` also handles Tab for typeahead (line 31). When completion exists AND query is non-empty, both handlers fire — the input handler catches it first, which is correct, but when completion is `null` and query is non-empty, Tab does nothing (expected browser behavior lost). Minor, but Tab should only toggle AI mode when query is empty — this works, just documenting.

3. **Scope filter overflow on mobile**: `CommandSearchFilters.tsx` renders 8 filter pills in a `flex` row with no overflow handling. On narrow viewports they'll wrap or overflow. Needs `overflow-x-auto` and `scrollbar-hide`.

4. **Analytics card click area too small**: The inline analytics card (line 108) uses `w-[calc(100%-2rem)] mx-4` — the margin creates dead click zones on the edges that feel broken.

5. **Footer keyboard hints not responsive**: The footer bar (line 638) shows all hints on mobile but they crowd. The "Tab → ask Zura" hint is irrelevant on mobile (no physical keyboard).

### UX Gaps
6. **No loading state for initial search**: When entity hooks (`useCommandEntitySearch`) are loading on first open, there's no skeleton/indicator — the panel just shows empty proactive state until data arrives.

7. **AI answer card not dismissible**: Once the AI card appears, there's no way to dismiss it without clearing the query or toggling AI mode off. A small close/dismiss button would help.

8. **No results count in footer**: When results exist, showing "X results" in the footer would give confidence the search is working.

9. **Preview panel has no close gesture**: On desktop the preview panel appears for hovered results but can't be dismissed — it just stays until you hover a non-previewable result.

### UI Polish
10. **Inconsistent border radius**: The main panel uses `rounded-xl` but the AI answer card uses `rounded-xl` too, creating a card-in-card with matching radii. The inner card should use `rounded-lg` for hierarchy.

11. **CommandResultRow action chip always visible**: Line 96 has `(isSelected || true)` — the `|| true` defeats the conditional, making the "Open"/"Run" chip always visible on top results instead of only on hover/select. Should be just `isSelected` or removed entirely if always-visible is intended (remove the dead conditional).

12. **Suggestion panel padding inconsistency**: `CommandSuggestionPanel` uses `px-2` while all other panels use `px-4`/`px-5`.

13. **No `aria-label` on the surface**: The panel has `<span className="sr-only">Search</span>` but the outer `motion.div` has no `role="dialog"` or `aria-label`.

14. **Missing `reduced-motion` compliance**: All animations use spring physics with no `prefers-reduced-motion` fallback.

## Changes

### `CommandInput.tsx`
- Add `leading-6` to both the input and ghost text overlay for alignment
- Ensure ghost text container matches input's vertical position precisely

### `CommandSearchFilters.tsx`
- Add `overflow-x-auto scrollbar-hide` to the filter row
- Hide less common filters on mobile (keep All, Pages, People, Clients)

### `CommandResultRow.tsx`
- Fix line 96: remove `|| true` so action chip shows only on hover/selected
- Add `will-change-opacity` for smoother chip transitions

### `CommandInlineAnalyticsCard.tsx`
- Change outer container from `w-[calc(100%-2rem)] mx-4` to `mx-3` with `w-auto` for consistent edge-to-edge click area

### `CommandAIAnswerCard.tsx`
- Change `rounded-xl` to `rounded-lg` for inner card hierarchy
- Add a small dismiss X button in the header row

### `CommandSuggestionRow.tsx`
- Fix padding: change `px-2` to `px-3` on the panel container to align with other sections

### `ZuraCommandSurface.tsx`
- Add `role="dialog" aria-label="Search"` to the main panel
- Add `useReducedMotion` check: when reduced motion is preferred, replace spring transitions with `duration: 0.01`
- Hide "Tab → ask Zura" keyboard hint on mobile
- Add subtle result count in footer when results exist

### `CommandNoResultsState.tsx`
- Remove `font-medium` from "Ask Zura" label (max weight rule: `font-medium` is allowed, but it's the only instance in the surface — verify consistency)

## Files Changed

| File | Change |
|------|--------|
| `src/components/command-surface/CommandInput.tsx` | Ghost text alignment fix |
| `src/components/command-surface/CommandSearchFilters.tsx` | Overflow scroll + mobile filter hiding |
| `src/components/command-surface/CommandResultRow.tsx` | Fix always-visible action chip |
| `src/components/command-surface/CommandInlineAnalyticsCard.tsx` | Click area + padding fix |
| `src/components/command-surface/CommandAIAnswerCard.tsx` | Border radius hierarchy + dismiss button |
| `src/components/command-surface/CommandSuggestionRow.tsx` | Padding alignment |
| `src/components/command-surface/ZuraCommandSurface.tsx` | Aria, reduced-motion, footer polish |

