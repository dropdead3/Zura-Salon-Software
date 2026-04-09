

# Command Overlay UI — Premium Polish & Refinement

## Audit Summary

The overlay already exists as `ZuraCommandSurface.tsx` with full functionality: search input, result panels, AI answers, actions, keyboard navigation, and recent sections. The foundation is solid. What follows is a targeted polish pass to elevate it from "functional search modal" to "premium command layer."

### What Already Works Well
- Glass aesthetic via `tokens.drawer.content` (`bg-card/80 backdrop-blur-xl`)
- Sidebar-aware centering via `--sidebar-offset`
- Full keyboard navigation (↑↓, Enter, Esc, Tab)
- Mobile full-screen (`max-sm:w-screen max-sm:h-screen`)
- Grouped results, AI card, action panel, recent section
- Footer with keyboard hints

### Gaps Identified

1. **Close button visible** — Dialog's default `X` button renders in top-right, competing with the search input controls
2. **Overlay position** — centered vertically (`top-[50%]`); command surfaces feel better top-weighted (~30-35% from top)
3. **Container radius mismatch** — Dialog defaults to `rounded-2xl`, ZuraCommandSurface overrides to `rounded-xl`. Should be consistent
4. **Input area lacks premium feel** — plain `border-b border-border/50` divider, search icon is standard weight, placeholder is generic
5. **Result rows lack depth** — no selected-row elevation, hover is plain `bg-muted`, no type-specific icon coloring
6. **Recent section feels thin** — icons are small/faint, no hover feedback beyond color, empty state is basic
7. **AI Answer card** — `bg-card-inner` blends into container; needs slight lift to feel like a distinct answer surface
8. **Footer hints** — functional but could feel more integrated with the glass aesthetic
9. **Empty state** — plain text, no visual weight, no personality
10. **Entry animation** — default dialog zoom-in-95 is fine but could use top-weighted slide origin
11. **Suggestion panel** — functional but visually disconnected from the result panel style

## Changes

### File 1: `src/components/command-surface/ZuraCommandSurface.tsx`

**Container refinements:**
- Override `top-[50%]` → `top-[35%]` (top-weighted positioning, feels like command layer not modal)
- Add `translate-y-[-35%]` to match
- Hide the default Dialog close button via `hideClose` or by adding a `[&>button:last-child]:hidden` override
- Max-width bump: `max-w-2xl` → `max-w-[720px]` (slightly wider for result breathing room)
- Add subtle top shadow: `shadow-[0_24px_64px_-16px_hsl(var(--foreground)/0.15)]` for depth without glow

**Footer polish:**
- Slightly refine the kbd styling to match the TopBarSearch ⌘K badge treatment (consistent border/bg)
- Add `font-display` to the shortcut labels for consistency with Zura typography

### File 2: `src/components/command-surface/CommandInput.tsx`

**Input area refinements:**
- Increase padding: `px-4 py-3` → `px-5 py-3.5` (more breathing room)
- Search icon: add `strokeWidth={1.5}` to match TopBarSearch (thinner, premium)
- Placeholder: "Search pages, people, or ask a question..." → "Search or ask Zura..." (matches the search bar, shorter, branded)
- AI toggle pill: add `rounded-full` instead of `rounded-md` (pill shape, more intentional)
- Esc kbd badge: match updated TopBarSearch badge styling (`bg-muted/70 border-border/50 text-[11px]`)
- Add inner highlight to input area: `shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.03)]` on the container div

### File 3: `src/components/command-surface/CommandResultRow.tsx`

**Row refinements:**
- Height: `h-11` → `h-12` (slightly more vertical space for scannability)
- Selected state: add `shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.05)]` for subtle depth on active row
- Hover: `hover:bg-muted` → `hover:bg-muted/60` (softer hover, less aggressive)
- Icon container: wrap icon in a `w-7 h-7 rounded-md bg-muted/40 flex items-center justify-center` box when selected, plain otherwise
- Type badge: refine to use `bg-muted/40` instead of `variant="outline"` for a softer, more integrated appearance
- ChevronRight: only show on hover/selected (add `opacity-0 group-hover/row:opacity-100` with `group/row` on the button)
- Add `group/row` class to the button element

### File 4: `src/components/command-surface/CommandResultPanel.tsx`

**Panel refinements:**
- Group dividers: `border-t border-border/30` → `border-t border-border/20` (even softer separation)
- Group labels: already using `tokens.heading.subsection` — no change needed
- Add max visible results hint: if a group has >5 results, show count badge after label

### File 5: `src/components/command-surface/CommandRecentSection.tsx`

**Recent section refinements:**
- Row height: `h-9` → `h-10` (match result row proportions)
- Icons: `w-3.5 h-3.5` → `w-4 h-4` (slightly larger for visual weight)
- Icon opacity: `text-muted-foreground/50` → `text-muted-foreground/40` (softer at rest)
- Add hover icon brightening: `group/recent` on button, `group-hover/recent:text-muted-foreground` on icon
- Empty state: replace plain text with slightly richer layout — use `Search` icon at `w-6 h-6` with `text-muted-foreground/15`, tighter spacing, branded copy "Search or ask Zura..."
- Add `transition-colors duration-150` to row buttons

### File 6: `src/components/command-surface/CommandAIAnswerCard.tsx`

**AI card refinements:**
- Border: `border-border/50` → `border-primary/10` (very subtle brand tint on AI surfaces)
- Background: `bg-card-inner` → `bg-card-inner/80` with a `backdrop-blur-sm` (slight glass lift from results)
- Sparkles icon: `w-3 h-3` → `w-3.5 h-3.5` (slightly more presence)
- "AI Answer" label: already uses correct tiny uppercase token pattern — no change
- Show more/less button: add `transition-colors duration-150`

### File 7: `src/components/command-surface/CommandEmptyState.tsx`

**Empty state refinements:**
- Reduce vertical padding: `py-10` → `py-8`
- Icon: `w-8 h-8` → `w-6 h-6`, `text-muted-foreground/30` → `text-muted-foreground/15` (more ghosted)
- Add a subtle "Try:" suggestion line with 2-3 example queries as clickable pills
- "Ask AI instead" link: wrap in a subtle border pill instead of plain text link

### File 8: `src/components/command-surface/CommandSuggestionRow.tsx`

**Suggestion panel refinements:**
- Row height: match `h-10` for consistency
- Icons: `w-3.5 h-3.5` → `w-4 h-4` for consistency
- Add `transition-colors duration-150` to rows
- "No results" header: reduce icon size from `w-6 h-6` to `w-5 h-5`, tighten spacing

### File 9: `src/components/ui/dialog.tsx`

**Dialog base refinements:**
- Add support for `hideClose` prop on `DialogContent` to suppress the X button when used as a command surface
- Top-weight option: allow `className` to override `top-[50%]` positioning (already works since it's in `cn()`)

## Entry Transition

The dialog already uses `animate-in`/`animate-out` with `zoom-in-95`/`fade-in-0`. The top-weighted positioning (`top-[35%]`) naturally shifts the zoom origin upward, making it feel like it emerges from the search bar area. The existing `duration-200` is correct — fast and fluid. No custom animation keyframes needed.

## Responsive Behavior

Already handled well:
- Desktop: centered overlay with sidebar offset
- Mobile: `max-sm:w-screen max-sm:h-screen max-sm:rounded-none`
- One refinement: on mobile, the top-weighted positioning needs to reset to standard centering — add `max-sm:top-[50%] max-sm:translate-y-[-50%]`

## Performance

All changes are CSS-only refinements. No DOM structure changes, no new components, no layout shifts. Sub-frame rendering guaranteed.

## Self-Audit

- **Visual hierarchy**: Top-weighted positioning + refined input area establishes clear command layer feel
- **Speed**: No additional renders, no new state, no new hooks
- **Cohesion**: All styling uses existing tokens and HSL variables — nothing new introduced
- **Restraint**: No glow effects, no bright colors, no size increases beyond 1-2px breathing room
- **Integration**: Glass aesthetic, border treatments, and typography all match existing Zura patterns
- **Keyboard**: No keyboard behavior changes — already first-class

## Files Summary

| File | Action |
|------|--------|
| `src/components/command-surface/ZuraCommandSurface.tsx` | Edit — top-weight positioning, hide close button, width, shadow |
| `src/components/command-surface/CommandInput.tsx` | Edit — padding, icon weight, placeholder, pill shape, badge polish |
| `src/components/command-surface/CommandResultRow.tsx` | Edit — row height, hover/selected states, icon boxing, chevron reveal |
| `src/components/command-surface/CommandResultPanel.tsx` | Edit — softer dividers, group count badges |
| `src/components/command-surface/CommandRecentSection.tsx` | Edit — row sizing, icon polish, hover feedback, empty state |
| `src/components/command-surface/CommandAIAnswerCard.tsx` | Edit — border tint, glass lift, icon sizing |
| `src/components/command-surface/CommandEmptyState.tsx` | Edit — tighter spacing, example query pills, AI fallback pill |
| `src/components/command-surface/CommandSuggestionRow.tsx` | Edit — row consistency, icon sizing, transitions |
| `src/components/ui/dialog.tsx` | Edit — add `hideClose` prop support |

No new files. No new design tokens. No database changes.

