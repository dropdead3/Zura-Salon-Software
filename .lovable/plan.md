

# Empty-State, No-Results, and AI Fallback Polish

## Audit Findings

**Pre-type state** (`CommandProactiveState`): Already strong — has Continue, Quick Paths, Attention, and Suggested sections. The absolute fallback (no data at all) shows a bare "Search or ask Zura..." with a ghosted icon, which is fine but could be slightly warmer.

**No-direct-results state** (lines 420-442 in `ZuraCommandSurface`): Currently an inline block with centered Search icon, "No results for..." text, generic "Try a different search, or continue with AI" copy, and a standalone `Continue with Zura AI` pill button. Issues: centered layout feels like an error state, the copy is generic, the button uses `tabIndex={-1}` (not keyboard-reachable), and there's no partial interpretation shown.

**With suggestions** (`CommandSuggestionPanel`): Shows "No results for..." header + suggestion rows. The AI continuation is buried inside suggestions as a `topic` type row. No standalone AI CTA if suggestions exist.

**`CommandEmptyState`**: Exists as a component but is never imported or used in `ZuraCommandSurface`. Dead code — uses "Ask AI instead" copy.

**AI Answer Card**: Good pattern — `bg-card-inner/80 backdrop-blur-sm border-primary/10`. This material language should be reused for the AI fallback card.

**Key problems to fix:**
1. No-results state feels like failure — needs reframing
2. AI continuation button not keyboard-accessible (`tabIndex={-1}`)
3. `CommandEmptyState` is dead code — should be removed or consolidated
4. `CommandSuggestionPanel` duplicates the "No results" header but has no AI CTA when suggestions exist
5. Partial interpretation from `chainedQuery` not shown in no-results state
6. Copy is generic, not Zura-native

## Plan

### Files to Edit (3)

**`src/components/command-surface/CommandSuggestionRow.tsx`** — Refine `CommandSuggestionPanel` to include an AI continuation row at the bottom when suggestions exist, and improve copy from "No results for..." to softer framing.

**`src/components/command-surface/ZuraCommandSurface.tsx`** — Replace the inline no-results block (lines 420-442) with a new `CommandNoResultsState` component. Pass `chainedQuery` for partial interpretation display. Make AI fallback row keyboard-navigable (remove `tabIndex={-1}`, integrate into arrow key navigation). Wire Enter on AI fallback row to trigger `handleAIFallback`.

**`src/components/command-surface/CommandNoResultsState.tsx`** — New component. Clean, left-aligned layout (not centered). Three sections:
1. **Partial interpretation row** (conditional): If `chainedQuery` has `slotCount >= 1`, show a subtle line like "Zura understood: [chips]" using the same `ChainSegment` chip style, establishing trust that the query was parsed even though no direct match exists
2. **AI continuation card**: Primary action — `bg-card-inner/60 border border-primary/10 rounded-lg` matching `CommandAIAnswerCard` material. Sparkles icon + "Ask Zura" label + the user's query shown as context. Full keyboard focus support. Hover: `bg-primary/5`. Copy: "No direct match for [query]. Zura AI can help interpret, answer, or route this."
3. **Secondary suggestions**: If any exist, render beneath the card using existing `CommandSuggestionRow` pattern

**`src/components/command-surface/CommandEmptyState.tsx`** — Delete (dead code, never imported).

### Copy Decisions

| State | Current | Proposed |
|-------|---------|----------|
| No-results header | "No results for '...'" | "No direct match" (smaller, calmer — not an error) |
| No-results subtext | "Try a different search, or continue with AI" | Removed — the AI card itself communicates the next step |
| AI CTA button | "Continue with Zura AI" | "Ask Zura" (shorter, native, action-first) |
| AI CTA supporting text | None | "Zura AI can help answer or route this" (one line beneath, xs, muted) |
| Suggestion panel header | "No results for '...'" | "No direct match. Try these instead:" |

### AI Continuation Card Design

```
┌─────────────────────────────────────────────┐
│  ✦  Ask Zura                          ↵     │
│     Zura AI can help answer or route this   │
└─────────────────────────────────────────────┘
```

- Material: `bg-card-inner/60 border border-primary/10 rounded-lg mx-3 p-3`
- Icon: Sparkles `w-4 h-4 text-primary`
- Title: `font-sans text-sm text-foreground font-medium` — "Ask Zura"
- Subtitle: `font-sans text-xs text-muted-foreground` — "Zura AI can help answer or route this"
- Right affordance: subtle Enter key hint (`kbd` style matching footer)
- States: idle → hover (`bg-primary/5`) → focused (ring-1 ring-primary/20) → pressed (scale-[0.995]) → loading (Sparkles animate-pulse, card transitions into AI answer)

### Keyboard Behavior

- In no-results state with no suggestions: AI continuation card is auto-focused (selectedIndex = 0 maps to it). Enter triggers `handleAIFallback`.
- In no-results state with suggestions: AI card is the first item, suggestions follow. Arrow keys navigate all. Enter on AI card triggers AI mode; Enter on suggestion navigates/corrects.
- Integration: Add a `noResultsActionCount` (1 for AI card + suggestion count) to the keyboard handler so ArrowDown/Up can reach the AI card and suggestions.

### Partial Interpretation Display

When `chainedQuery.slotCount >= 1` and no results exist, show a muted line above the AI card:
```
Understood: [📊 Retail] [🕐 Last 30 Days]  — no direct match
```
Uses existing `ChainSegment` chips at reduced opacity. This builds trust — the user sees Zura parsed their intent even without a deterministic result.

### Responsive

- Desktop: AI card with padding, partial interpretation visible
- Mobile (<768px): AI card full-width, no partial interpretation (keep it simple)

### Files Summary

| File | Action |
|------|--------|
| `src/components/command-surface/CommandNoResultsState.tsx` | Create — unified no-results + AI fallback |
| `src/components/command-surface/ZuraCommandSurface.tsx` | Edit — replace inline no-results block with new component, wire keyboard |
| `src/components/command-surface/CommandSuggestionRow.tsx` | Edit — add AI CTA row at bottom of suggestion panel, refine copy |
| `src/components/command-surface/CommandEmptyState.tsx` | Delete — dead code |

No database changes. No new design tokens.

