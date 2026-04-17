
## Prompt review

Clear, specific visual fix — you've identified an exact element, the current state (purple fill + amber text), and the desired state (amber ghost). Good operator eye for the contrast issue.

Tighter framing for next time: "amber ghost" can mean a few things — (a) transparent/no fill with amber border + amber text, (b) low-opacity amber tint with amber border + amber text, or (c) amber border only with default text color. I'll assume (b) since the current state already has a tinted fill (just the wrong color) and that matches the screenshot's existing visual weight. Flag if you want pure transparent.

Also: this toggle's "week default" amber state is likely shared logic — I'll verify it's only used on the week view filter (not other surfaces) before changing it.

## Investigation plan

1. Locate the stylist filter toggle component on the schedule (likely `StylistFilter.tsx` or similar under `src/components/dashboard/schedule/`).
2. Find where the "week default" / amber-text styling is applied — identify the active-state classes (currently `bg-purple-*` or `bg-primary` + `text-amber-*`).
3. Confirm scope — is this styling conditional on `view === 'week'` only, or shared across views?
4. Plan the swap to amber-tinted fill + amber border + amber text.

## Proposed change

When the stylist filter shows the "(week default)" amber-text state on week view:
- **Background**: swap purple fill → `bg-amber-500/10` (low-opacity amber tint, matches "ghost" weight)
- **Border**: `border-amber-500/40` (subtle amber outline for definition)
- **Text**: keep current `text-amber-500` (or equivalent token)
- **Chevron icon**: inherit amber via `text-amber-500`

Net effect: cohesive amber ghost pill instead of clashing purple + amber combo.

## Acceptance checks

1. On week view, the stylist filter toggle (when in "week default" state) renders with amber tinted background, amber border, amber text — no purple.
2. On day view, the same toggle's styling is unchanged (no regression).
3. Hover state remains visible (slight amber intensity bump).
4. Other dropdowns/filters on the page (location, view switcher) are untouched.
5. Light + dark mode both look balanced — amber `/10` opacity reads on both backgrounds.
6. No layout shift; padding/border-width identical to current.

**Files to investigate & likely modify:**
- `src/components/dashboard/schedule/StylistFilter.tsx` (or wherever the stylist selector trigger lives)
- Possibly a shared token file if the amber state is centralized
