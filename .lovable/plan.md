
## Prompt review

Clear and visual — the screenshot pinpoints exactly which surface (booking wizard's client step) and the desired direction (move from right rail → top horizontal). Teaching note: the alphabet was *already clickable* — calling out "make it more visible / discoverable as a filter" instead of "make it clickable" would have been even more precise. Micro-improvement: when moving UI between axes (vertical → horizontal), specifying behavior under width constraint ("wrap, scroll, or shrink letters?") helps lock the responsive answer in one round.

## Diagnosis

`ClientStep.tsx` already has:
- A clickable `AlphabetStrip` with available/disabled letters and toggle-to-clear behavior.
- Filtering logic (`filteredClients`) keyed off `activeLetter`.
- An "available letters" set so unused letters render dimmed.

It's just rendered as a thin vertical rail at `right-1 top-0 bottom-0 w-5`. All the logic stays; only the layout component changes.

## Fix — horizontal strip under the search bar

### 1. Replace `AlphabetStrip` with `AlphabetBar` (horizontal)
- Render letters in a single horizontal row, evenly distributed using `flex justify-between` so the 26 letters span the panel width edge-to-edge (matches the calm/executive density of the wizard).
- Each letter is a small `button`:
  - Available: `text-muted-foreground hover:text-foreground` + subtle hover bg.
  - Active: `text-primary` with `bg-primary/10` pill background to make selection unmistakable.
  - Disabled (no clients): `text-muted-foreground/30 pointer-events-none`.
- Tap target: `h-7 min-w-[18px]` so it stays usable on touch without feeling chunky.
- Typography: `font-sans text-[11px]` (Aeonik Pro, never uppercase per token rules — letters are inherently single-char so case is moot, but keep `font-sans`).
- Drop the `onTouchMove` swipe-scrub — irrelevant in horizontal layout where every letter is already one tap away.

### 2. Place the bar inside the search-bar block
- New structure for the top region:
  ```
  <div className="border-b border-border">
    <div className="p-4 pb-3">{search + add-client}</div>
    {showAlphabetBar && (
      <div className="px-3 pb-3">
        <AlphabetBar ... />
        {activeLetter && <ClearChip />}  // tiny "Clear A" link, right-aligned
      </div>
    )}
  </div>
  ```
- The `ScrollArea` below loses its right-padding hack (`pr-8`) since the rail is gone — change `cn('p-2', showAlphabetStrip && 'pr-8')` → `'p-2'`.
- Remove the absolutely-positioned `<AlphabetStrip>` block at the bottom of the list container.

### 3. Empty-state copy unchanged
The existing "No clients starting with 'X'" + clear-filter link continues to work since `activeLetter` state and handlers are preserved.

### 4. Active letter ergonomics
- Keep the toggle behavior (click active letter again → clear).
- Add a small inline "Clear" affordance next to the bar when `activeLetter` is set, since horizontal selection isn't as obvious as a highlighted vertical rail item — gives explicit escape.

## Acceptance checks

1. Booking wizard → Client step shows search bar, then horizontal A–Z bar directly beneath it, then list. No vertical rail on the right.
2. Letters with at least one client are interactive; letters with none are visibly dimmed and unclickable.
3. Clicking a letter filters the list to clients whose first name starts with that letter; section header for that letter still shows.
4. Clicking the active letter again (or "Clear" chip) restores the full list.
5. Letter selection persists while typing in search; combined filter works (search narrows within the letter, or letter narrows within search results — current logic already filters sortedClients by `activeLetter` regardless of search).
6. List items now occupy full panel width (no reserved right gutter).
7. Empty state still offers "Clear filter" + "Add new client".
8. No regressions to the new-client (`UserPlus`) button or banned-client warning dialog.
9. Mobile: bar still fits — 26 single-letter buttons across the panel width works at the wizard's narrowest mobile width with `flex-1 min-w-0` letters.

## Out of scope

- Restyling the search input or add-client button.
- Changing sort order (still alphabetical by first name).
- Per-section sticky letter headers in the scroll list.
- Server-side filtering — purely client-side over the already-loaded list.

## Files to touch

- `src/components/dashboard/schedule/booking/ClientStep.tsx`
  - Replace `AlphabetStrip` (vertical, absolutely positioned) with `AlphabetBar` (horizontal, in-flow under the search bar).
  - Remove the `pr-8` reserve in the scroll area.
  - Add a small "Clear" chip when a letter is active.

## Further enhancement suggestions

- Add a subtle slide/scale transition on the active-letter pill (`transition-all duration-150`) for a more premium feel that matches the wizard's animation language.
- When `searchQuery` is non-empty, dim letters that aren't represented in the search-filtered results (right now they reflect the full list) — gives more honest feedback.
- Consider sticky letter section headers inside the list so as you scroll, you always know what letter you're in — pairs well with the new top bar as a "mini map → current position" relationship.
