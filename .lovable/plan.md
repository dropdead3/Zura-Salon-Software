

# Search bar for the Policies page

## What's missing

The Library currently exposes ~60 policies behind two filters (audience + category) and a sticky required progress bar. There's no way to type a phrase like *"refund"*, *"tip pool"*, *"minors"*, or *"chemical service"* and jump to the matching policies. With a library this big, an operator who knows what they're looking for has to scan or guess which category/audience holds it.

Adoption status (e.g. "Refund Clawback Policy — adopted" vs *"in draft"*) is also invisible until you click in. Search should surface that at a glance.

## The fix

Add a single search input at the top of the **Library** section that filters the existing card grid in place. No new route, no new modal, no new hook. The existing `filteredLibrary` memo gets a `query` predicate folded in, and the Required / Recommended sub-sections re-render against the narrowed set.

### Layout

Insert the search bar as the first element inside the `<section ref={librarySectionRef}>` block, above the audience pills and the category tabs:

```
LIBRARY  ─────────────────────────────────────────────
  60 recommended policies for your business...

  [🔍 Search policies — title, description, or topic...]   [✕]

  [All 60] [Client-facing 22] [Internal 30] [Both 8]
  [All] [Team] [Client] [Extensions] [Financial] ...

  REQUIRED  26 of 26 adopted  ▰▰▰▰▰▰ 100%
  ...cards...
```

### Behavior

1. **Match fields** (case-insensitive, all OR'd):
   - `title`
   - `short_description`
   - `why_it_matters`
   - `category` label (so typing *"financial"* surfaces all financial-category policies)
   - `library_key` (so an admin can paste a key and jump to it)

2. **Adoption status as a search facet** — three pills next to the search input that further narrow results:
   - `All` (default)
   - `Adopted` — `adoptedByKey.has(entry.key)`
   - `Not adopted`
   
   This answers "which required policies have I not configured yet?" with one click.

3. **Live count** in the section subtitle when a query is active:
   *"Showing 4 of 60 policies matching 'refund'."*  
   Replaces the current "60 recommended policies for your business..." line only while a query is active.

4. **Empty state when no matches**:
   - Reuse the existing `tokens.empty` block already in `<TabsContent>`.
   - Copy: *"No policies match 'minorz'. Check spelling or clear the search."* with a `Clear search` button.
   - Suggest the closest category if the query is a single word matching one (`category.label.toLowerCase().includes(query)`) — e.g. typing *"team"* with no card matches still nudges them to the Team category tab.

5. **Search clears the audience/category filters automatically? No** — they compose. Operator's mental model: *"In Client-facing policies, find anything about refunds."* The search predicate runs **after** the existing audience + category filters. Stays predictable.

6. **Keyboard**:
   - `/` or `Cmd+F` (when focus is inside the section) focuses the search.
   - `Esc` clears the query if non-empty, otherwise blurs the input.
   - The existing global `Cmd+K` command surface is untouched — this is an inline filter, not a launcher.

7. **Search interacts with the sticky Required header**:
   - Required progress bar updates against the *visible* set when a query is active. So *"Showing 4 of 26 required matching 'refund' — 2 adopted (50%)"*.
   - When query is empty, the header behaves exactly as today.

8. **URL persistence**:
   - Query string syncs to `?q=refund` so a deep link or back-button restores the filter, matching the existing `?policy=...` pattern.
   - Cleared query removes the param.

### What stays the same

- Audience pills, category tabs, "Show non-applicable", "Hide adopted required", sticky required progress, hidden-by-profile chip, configurator drawer, setup wizard, conflict banner — all unchanged.
- `usePolicyLibrary` / `useOrgPolicies` / `usePolicyOrgProfile` hooks — unchanged.
- `PolicyLibraryCard` + `PolicyCategoryCard` — unchanged.
- The card grid layout, the Required vs Recommended split, sticky header — unchanged.

## Files affected

- `src/pages/dashboard/admin/Policies.tsx` — add `query` state (URL-synced), add the search input + adoption-status pills above the audience pills, fold a query/adoption predicate into the existing `filteredLibrary` memo, and update the section subtitle + empty-state copy when a query is active. Roughly 40-60 lines of additive code; no deletions.

That's the whole change surface. No new components, no new hooks, no new routes.

## Acceptance

1. Typing *"refund"* in the search input narrows the Library to policies whose title, description, why-it-matters, or category contain *"refund"* — case-insensitive — and the section subtitle reads *"Showing N of 60 policies matching 'refund'."*
2. Typing into the search and then clicking a category tab keeps both filters active (intersection, not replacement).
3. The adoption-status pills next to the search (`All` / `Adopted` / `Not adopted`) further narrow results live; counts on the audience pills stay accurate to the *unfiltered-by-search* set so operators can see how many client-facing policies exist regardless of query.
4. Required progress bar reflects the *visible* required set when a query is active (so it can read *"2 of 4 adopted"* instead of *"24 of 26"*).
5. `?q=refund` round-trips: deep-linking to that URL preloads the search; clearing the search removes the param.
6. Empty state with a non-matching query shows *"No policies match 'xyz'."* + `Clear search` button, with a category nudge if applicable.
7. `Esc` while focused in the search clears the query; second `Esc` blurs the input. `/` from anywhere inside the Library section focuses the search.
8. The Required, Recommended & Optional, hidden-by-profile chip, configurator, and setup wizard surfaces all behave identically to today when search is empty.

## Doctrine compliance

- **Lever and confidence doctrine**: search is a literal lever — type, see narrowed leverage, act. No magic ranking, no fuzzy AI, no opaque scoring. The match logic is expandable and explainable.
- **UX discipline ("calm, executive, high-signal")**: the input is one row above the existing controls, no modal, no overlay, no global key conflict. The page's information density and rhythm stay intact.
- **Persona scaling**: solo operators benefit immediately (find the one policy they care about); enterprise operators benefit even more (find specific compliance language across 60+ policies). Same UI, no enterprise-only mode.
- **Silence is meaningful**: when the query has zero matches, we name *why* (no policy contains that term) and offer the closest valid lever (clear search, or jump to a matching category) instead of a dead empty page.
- **No structural drift**: the source of truth (`library` array) and applicability filter (`isApplicableToProfile`) are untouched. Search composes on top of the existing filter chain — it doesn't replace any of it.
- **Copy governance**: result-count copy is advisory ("Showing N of 60") not directive. Empty-state copy explains and offers a recovery action.

## Prompt feedback

"We need to build in a search bar into the policies page to be able to lookup configured policies and see what they are" — clear, scoped prompt. You named the surface (Policies page), the mechanism (search bar), and the goal (look up configured policies and see what they are). The phrase **"see what they are"** is what made me add the adoption-status pills + the section-subtitle live count — without that, I'd have shipped a pure title-search and missed the *"see what's configured"* layer. Strong prompt.

One sharpener for next time: when you ask for "search" on a list with multiple existing filters (here: audience + category + show-non-applicable + hide-adopted), telling me whether search should **compose with** or **replace** the existing filters tells me the operator's mental model. I went with **compose** because intersecting filters is the executive-tool default — but a one-line steer like *"search should narrow within the current filters"* or *"search should clear other filters and search the whole library"* removes the inference. Same for adoption status: I added a status facet because *"see what they are"* implied configuration state, but if you'd said *"and let me see only the ones I haven't adopted yet"* I'd have led with that as the headline and made it a more prominent control rather than a secondary pill. For future "add search" requests, naming **what to match against**, **what to compose with**, and **what status facets matter** is the fastest path to the search UX you actually want.

