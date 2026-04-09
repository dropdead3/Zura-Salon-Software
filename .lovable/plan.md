

# Command Chaining UI — Interpreted Query Visualization

## What Already Exists

The entire data pipeline is built and working:
- `queryParser.ts` produces `ParsedQuery` with tokens, intents, time context, action intent, filters
- `queryChainEngine.ts` produces `ChainedQuery` with typed slots: subject, topic, timeRange, locationScope, rankingModifier, negativeFilter, actionVerb, subjectType, destinationHint, confidence, slotCount
- `useSearchRanking` already computes `chainedQuery` and returns it (line 337) — but `ZuraCommandSurface` never consumes it
- `Badge` component has a `glass` variant with backdrop-blur that matches the overlay aesthetic
- `AnalyticsFilterBadge` is the existing chip/badge pattern used across analytics cards

The UI layer is the only missing piece.

## Architecture

### New Files (2)

**`src/components/command-surface/CommandChainBar.tsx`** — The interpreted query visualization strip. Renders between `CommandInput` and the results area. Consumes a `ChainedQuery` and renders a horizontal row of typed chips.

**`src/components/command-surface/ChainSegment.tsx`** — Individual interpreted segment chip. Handles segment type differentiation (icon, label, style), click-to-edit popover for time/location segments, and disambiguation display.

### Edited Files (2)

**`src/components/command-surface/ZuraCommandSurface.tsx`** — Destructure `chainedQuery` from `useSearchRanking`. Render `CommandChainBar` between input and results when visibility conditions are met. Pass `onQueryChange` for editable refinement.

**`src/hooks/useSearchRanking.ts`** — No changes needed. `chainedQuery` is already returned.

## Visibility Rules

The chain bar appears only when ALL of:
1. Query has 2+ characters
2. `chainedQuery.slotCount >= 2` (single-slot queries don't benefit)
3. `chainedQuery.confidence >= 0.4` (low-confidence = don't show fake structure)
4. Not in AI mode (AI mode handles its own context)
5. No active action panel (action panel already shows interpreted intent)

This means simple searches like "Ashley" or "settings" show nothing. Structured queries like "Brooklyn retail last 30 days" show the full chain bar.

## Chain Bar Design

A single horizontal row rendered as a `div` with `flex items-center gap-1.5 px-5 py-2 border-b border-border/20`. Sits directly below the input area, above results. Contains:

- A faint "Zura understands:" kicker label (font-sans, text-[10px], text-muted-foreground/50, uppercase, tracking-wider) — or just render chips with no label to keep it minimal
- A sequence of `ChainSegment` chips representing filled slots

Each chip uses `Badge` variant="outline" base with refinements per segment type:
- **Location**: MapPin icon (w-3 h-3), text shows location name
- **Topic/Metric**: BarChart3 icon, text shows topic label (capitalized)
- **Time Range**: Clock icon, text shows human label from `timeRange.label`
- **Ranking**: ArrowUpDown icon, text shows "Top" / "Lowest" etc.
- **Negative Filter**: Filter icon, text shows human-readable filter ("No bookings, 60 days")
- **Subject**: User icon, text shows subject value
- **Action**: Zap icon, text shows action type

All chips: `h-6 px-2 rounded-md text-[11px] font-sans bg-muted/40 border border-border/30 text-foreground/80`. No heavy colors — monochrome with subtle icon tinting via `text-muted-foreground/60` on the icon.

## Editable Refinement (Phase 1 — Time & Location only)

Time and location chips are clickable. Clicking opens a tiny inline popover (using existing `Popover` component) with predefined options:

- **Time**: Today, This Week, Last 7 Days, Last 30 Days, This Month, Last Month, This Quarter
- **Location**: List from `activeLocations` already available in `useSearchRanking`

Selecting an option reconstructs the query string by replacing the matched time/location tokens. This is achieved by:
1. Identifying which tokens in the original query correspond to the slot (using token positions from `ParsedQuery`)
2. Replacing those tokens with the new value
3. Calling `onQueryChange(newQuery)` which triggers the full re-parse pipeline

Other chip types (subject, topic, filter) are not editable in phase 1 — they display as read-only.

## Ambiguity Handling

When `chainedQuery.subject` exists but `chainedQuery.subjectType` is null or confidence is low (< 0.6), the subject chip shows a subtle `?` indicator and a tooltip: "Could be a client or stylist." No modal disambiguation in phase 1 — the results already show both interpretations via the ranking engine. The chip just acknowledges the ambiguity.

## Keyboard Behavior (Phase 1)

Phase 1: Chain bar is not keyboard-focusable. Arrow keys continue to navigate results. The bar is purely visual + mouse-interactive for time/location editing.

Phase 2 (future): Tab from input focuses first editable chip. Left/Right navigates chips. Enter opens popover. Escape returns to input.

## Destination Hint Integration

When `chainedQuery.destinationHint` exists and confidence >= 0.7, the chain bar appends a subtle right-aligned CTA: "→ {destinationHint.label}" as a clickable link that navigates directly. This replaces the need to scan results for the "right" page. Styled as `text-primary/70 text-[11px] font-sans` with hover brightening.

## Performance

- `chainedQuery` is already memoized in `useSearchRanking`
- Chain bar renders pure props — no hooks, no fetches
- Popover options are static lists — no async loading
- Query reconstruction is synchronous string manipulation
- No debounce needed on the bar itself (it reads already-debounced chain output)

## Responsive Behavior

- Desktop (≥1024px): Full chip row with all segments visible
- Tablet (768–1023px): Same layout, chips may wrap to second line
- Mobile (<768px): Hidden entirely (`hidden sm:flex`) — mobile full-screen search stays focused on results

## Example Renderings

**"Brooklyn retail last 30 days"**
```
[📍 Brooklyn] [📊 Retail] [🕐 Last 30 Days]  → Retail Analytics · Brooklyn · Last 30 Days
```

**"top clients no bookings 60 days"**
```
[↕ Top] [👤 Clients] [⊘ No bookings, 60 days]
```

**"refunds this week Gilbert"**
```
[📊 Refunds] [🕐 This Week] [📍 Gilbert]  → Appointments — Refunds · Gilbert · This Week
```

**"Ashley appointments last month"**
```
[👤 Ashley ?] [📊 Appointments] [🕐 Last Month]
```
(Ashley chip shows `?` because subject type is ambiguous)

**"settings"** — No chain bar shown (slotCount < 2)

**"add client"** — No chain bar shown (action panel handles this)

## Files Summary

| File | Action |
|------|--------|
| `src/components/command-surface/ChainSegment.tsx` | Create — individual chip with type-specific icon + optional popover |
| `src/components/command-surface/CommandChainBar.tsx` | Create — horizontal strip consuming ChainedQuery, visibility logic, destination CTA |
| `src/components/command-surface/ZuraCommandSurface.tsx` | Edit — destructure `chainedQuery`, render `CommandChainBar` between input and results |

No database changes. No new design tokens. No parser or ranker changes.

