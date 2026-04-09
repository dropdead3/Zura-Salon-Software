

# Fix Build Errors + Replace Sparkles with ZuraZ Icon for AI Surfaces

## Two Issues

### 1. Build Errors in `searchLearning.ts`
The key functions `EVENTS_KEY`, `FREQ_KEY`, `GC_INTERVAL_KEY` are being passed as function references instead of being called. Every usage needs `()` appended — e.g., `EVENTS_KEY()` not `EVENTS_KEY`. Looking at the code, lines 85/93/119/137/147/155 already have `()` — so the build errors suggest the previous edit may have left some calls without parentheses elsewhere in the file. Will audit all usages and fix.

### 2. Replace Sparkles with ZuraZIcon in AI-context surfaces

The Sparkles icon is overused and does not represent the Zura AI identity. Every place where Sparkles indicates "AI mode" or "Zura" in the command surface should use the `ZuraZIcon` instead. Non-AI uses of Sparkles (e.g., service add-ons, service flows, decorative badges) remain unchanged.

**Files to update (command surface only — AI-indicator contexts):**

| File | What changes |
|------|-------------|
| `src/components/command-surface/CommandAIAnswerCard.tsx` | Replace `Sparkles` import with `ZuraZIcon`; use in header |
| `src/components/command-surface/CommandInput.tsx` | Replace `Sparkles` with `ZuraZIcon` in AI mode indicator (line 46) and AI toggle button (line 88) |
| `src/components/command-surface/CommandNoResultsState.tsx` | Replace `Sparkles` with `ZuraZIcon` in the "Ask Zura" fallback row |
| `src/components/command-surface/CommandSuggestionRow.tsx` | Replace `Sparkles` with `ZuraZIcon` for topic-type icon and "Ask Zura" button |
| `src/lib/searchLearning.ts` | Fix all function-reference vs function-call mismatches causing build errors |

### Not changing
- `ZuraCommandSurface.tsx` — imports Sparkles but grep shows no JSX usage of it there (only passed through). Will verify and remove unused import if confirmed.
- Non-AI Sparkles usages across the platform (service flows, add-ons, widgets, etc.) — these stay as-is.

## Technical Note
`ZuraZIcon` uses `fill="currentColor"` and accepts `className`, so it's a drop-in replacement for sizing/color via Tailwind classes like `w-4 h-4 text-primary`. No wrapper needed.

