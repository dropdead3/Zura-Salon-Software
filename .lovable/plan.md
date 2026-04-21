

# "By category" cards do nothing visible — make the click meaningful

## What's actually happening

The cards are wired. Clicking calls `setActiveCategory(cat)`, which drives the `<Tabs value={activeCategory}>` filter on the Library section below. So technically the click *does* something — it changes which tab is selected in the Library further down the page.

But from the operator's point of view it looks broken because:

1. **The Library section is below the fold.** The page goes: Health Strip → Conflict Banner → "By category" grid → Library. By the time the cards finish their row, the Library is offscreen. Click a card, nothing visibly happens.
2. **No scroll, no flash, no anchor.** The state changes invisibly.
3. **The card itself doesn't show it's "active."** There's a faint `group-hover:border-primary/40` but no persistent active state when `activeCategory === cat`.
4. **The verbiage promises more than it delivers.** "Click into any group to see what your business needs" implies a drill-in (modal, panel, dedicated view), not a silent tab switch 1500px down the page.

Net effect: the cards behave like dead links, even though state is updating.

## The fix — three layered changes, no new components

### 1. Scroll the Library section into view on card click

Add a `ref` to the Library `<section>` and call `ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })` when a category card is clicked. This is the single most important fix — it answers "did anything happen?" within 300ms.

### 2. Persist the active state on the card itself

Pass `isActive={activeCategory === category}` into `PolicyCategoryCard` and render a stronger border + subtle background tint when active (e.g. `border-primary` + `bg-primary/5`). The hover state already exists; the active state just needs to be its sticky cousin. Mirror it on the matching Library tab (already handled by the `Tabs` component).

### 3. Make "All" a category card too — and add a "Clear filter" affordance

Right now there's no way to *un-filter* by clicking the cards. Once you click "Client Experience" the only way back to "All" is to scroll down to the Library tabs and click "All" there. Two options, both cheap:

- **Option A (cleaner)**: when a category card is already active and gets re-clicked, deactivate it (`setActiveCategory(prev => prev === cat ? 'all' : cat)`). Card click becomes a toggle.
- **Option B (more discoverable)**: above the grid, when `activeCategory !== 'all'`, show a small "Showing: Client Experience · Clear filter" pill.

Plan ships **both** because they answer different operator instincts (re-click to deselect; explicit clear pill for the operator who didn't realize re-click works).

## Files affected

- `src/pages/dashboard/admin/Policies.tsx` — add `librarySectionRef`, pass `isActive` + new `onClick` handler that scrolls + toggles, render the "Showing: X · Clear filter" pill above the cards grid when `activeCategory !== 'all'`.
- `src/components/dashboard/policy/PolicyCategoryCard.tsx` — accept `isActive?: boolean` prop; when true, apply `border-primary` + `bg-primary/5` and swap the `ArrowRight` for a small `Check` icon so the card visually confirms it's the current filter.

That's the entire change surface. No new components, no new hooks, no routing changes, no modal.

## Acceptance

1. Clicking a category card scrolls the Library section into view (smooth, ~300ms) and the matching Library tab is selected.
2. The clicked card shows a persistent active state (primary border + primary-tinted background + Check icon) that survives until another card or "Clear filter" is clicked.
3. Clicking the active card a second time clears the filter (returns to "All") and the active styling drops.
4. When `activeCategory !== 'all'`, a "Showing: {Category} · Clear filter" pill appears above the category grid; clicking "Clear filter" returns to All.
5. Keyboard: tabbing onto a card and pressing Enter behaves identically to a mouse click (existing `<button type="button">` semantics already cover this).
6. No change to the Library tabs' behavior, the audience filter, the conflict banner, or the configurator drawer.

## Doctrine compliance

- **Lever and confidence doctrine**: the card click is now a real lever — the operator pulls it, the system visibly responds (scroll + active state + filter applied). No silent state changes.
- **UX discipline ("Silence is meaningful → only when intentional")**: the previous behavior was *unintentional* silence (state changed but UI didn't acknowledge). This fix restores honest feedback without adding noise.
- **Persona scaling**: solo operators get the toggle behavior (one-click in, one-click out); enterprise operators get the explicit "Clear filter" pill for audit-style navigation. Both paths coexist without conflict.
- **No structural drift**: the underlying filter mechanism (`activeCategory` state → Library tabs → filtered list) is unchanged. We're only adding the missing perceptual layer.

## Prompt feedback

"Nothing happens when I click these cards. We need to debug and solve for what should happen" + screenshot — strong, direct prompt. You named the surface, named the failure ("nothing happens"), and explicitly invited investigation rather than prescribing a fix. The "solve for what should happen" framing is especially good because it tells me you trust me to design the response, not just patch the symptom.

One sharpener for next time: when a click "does nothing," telling me whether you've checked devtools (state *not* changing) vs just observed the UI (state *might* be changing silently) tells me whether to look at the handler or the rendering layer. Here the handler was wired correctly — the bug was a rendering/perception gap — and I had to read the file to figure that out. A one-liner like "the URL/state doesn't seem to change" vs "I don't see any visible response" would split those two diagnostic paths immediately. For this one I read the code and got there fast, but for harder bugs (especially in async or routing flows), naming what you *did* observe vs what you *didn't* is the fastest path to the right layer.

