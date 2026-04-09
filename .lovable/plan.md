

# Interactive Navigation Links in AI Answer Cards

## Problem
When Zura AI answers a "how do I find X" question, the response is rendered as plain markdown text (screenshot shows: "Go to the **Roles & Controls Hub** in the **System** section..."). The user reads the directions but then has to manually navigate there. The grounding system already knows the exact destination path and tabs — this data just isn't surfaced as clickable UI.

## Solution
Pass the matched `verifiedDestinations` from the grounding result into the `CommandAIAnswerCard`, and render interactive breadcrumb-style navigation chips + a "Go there" button below the AI response. Clicking any segment navigates directly and closes the command surface.

## What the user sees

Below the AI text response, a new section appears:

```text
┌─────────────────────────────────────────────────┐
│  📍 Roles & Controls Hub                        │
│  System  ›  Roles & Controls Hub  ›  Permissions │
│                                    [Open →]      │
└─────────────────────────────────────────────────┘
```

- **Breadcrumb path**: `Section › Hub › Tab` — each segment is clickable
- **"Open" button**: navigates directly to the destination path (with tab query params if matched)
- Multiple destinations render as separate breadcrumb rows (e.g., if a query matches 2 pages)

## Changes

### 1. `CommandAIAnswerCard.tsx` — Add navigation links section
- Accept new prop: `destinations: NavDestination[]` and `onNavigate: (path: string) => void`
- After the markdown response, render a "Quick Links" section when `destinations.length > 0`
- Each destination renders as:
  - A breadcrumb trail: `Section › Label › Tab` (if a tab is matched by the query)
  - Each breadcrumb segment styled as a subtle link chip
  - An "Open" button that calls `onNavigate(dest.path + tabQuery)`
- Breadcrumb segments for parent hubs are also clickable if they have known paths

### 2. `ZuraCommandSurface.tsx` — Pass destinations + navigate handler
- Pass `groundingResult.verifiedDestinations` to `CommandAIAnswerCard`
- Pass a `onNavigate` callback that calls `handleSelect({ path, title, type: 'navigation' })` then closes the surface
- Only pass destinations when `groundingResult.isNavigation && groundingResult.verifiedDestinations.length > 0`

### 3. `navGrounding.ts` — Expose `verifiedDestinations` (already done)
- The `GroundedContext` interface already includes `verifiedDestinations: NavDestination[]`
- The `groundingResult` memoized in `ZuraCommandSurface` already contains this array
- No changes needed here

## Files Changed

| File | Change |
|------|--------|
| `src/components/command-surface/CommandAIAnswerCard.tsx` | Add `destinations` + `onNavigate` props, render breadcrumb links below AI response |
| `src/components/command-surface/ZuraCommandSurface.tsx` | Pass destinations and navigate handler to `CommandAIAnswerCard` |

## Design Details
- Breadcrumb uses `font-sans text-xs` (Aeonik Pro), with `›` separators
- Active destination label uses `text-primary` for emphasis
- "Open" button uses `tokens.button.inline` style (small, pill)
- Entire section has a subtle top border separator from the AI text
- When multiple destinations match, each gets its own breadcrumb row
- Tab segments are only shown if the query keywords matched a specific tab in the destination

