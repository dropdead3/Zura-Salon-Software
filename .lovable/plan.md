

# Add Micro-Analytics + Reset to Persona Explorer

## What We're Adding

1. **Micro-analytics tracking** — emit `CustomEvent`s when a persona is selected and when problems are toggled, using the existing `nav-tracking.ts` pattern. Any analytics integration can subscribe to these events.

2. **Reset breadcrumb trail** — a small inline breadcrumb at the top of the explorer (appears after a persona is selected) showing the current path: `All → Independent Stylist → 2 problems selected`, with clickable "Start over" to reset state.

## File Changes

### Modify: `src/components/marketing/PersonaExplorer.tsx`

**Analytics:**
- Import a new `emitExplorerEvent` helper (defined in same file or inline)
- Fire `persona_selected` event in `handlePersonaSelect` with `{ persona: key }`
- Fire `problem_toggled` event in `toggleProblem` with `{ persona, problemId, action: 'add' | 'remove', selectedProblems }`
- Fire `solutions_viewed` event when solutions render (via `useEffect` on `filteredSolutions.length > 0`) with `{ persona, problems: selectedProblems }`
- Events use `window.dispatchEvent(new CustomEvent(...))` — same pattern as `nav-tracking.ts`

**Reset breadcrumb:**
- Add a small bar between the header and persona cards that appears (animated) once a persona is selected
- Shows: current persona label + problem count + "Start over" link
- "Start over" resets both `selectedPersona` and `selectedProblems` to initial state
- Uses `motion.div` with fade-in, consistent with existing animation style
- Styled with `text-slate-500 text-sm` — minimal, non-intrusive

### Modify: `src/lib/nav-tracking.ts` (optional)
- Extend `emitNavEvent` to accept explorer event names, OR keep explorer events as a separate utility. Leaning toward keeping them inline in PersonaExplorer since they're component-specific — no new files needed.

## Technical Notes
- Zero new files, zero new dependencies
- Events are fire-and-forget `CustomEvent`s — no database writes, no API calls
- Dev mode logs events to console via `import.meta.env.DEV` check
- Reset button clears React state only — no side effects

