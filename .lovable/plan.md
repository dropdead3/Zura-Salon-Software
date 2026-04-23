

# Fix scroll-to-top on in-place view swaps (Settings + similar hubs)

## Diagnosis

When you click "System" on the Settings page (which sits at the bottom of the grid), the page swaps to the System detail view *in place* — `Settings.tsx` just flips a local `activeCategory` state from `null` to `'system'` and renders `<SettingsCategoryDetail>` instead of the grid. The browser URL doesn't change. The window scroll position doesn't change either.

Result: you were at the bottom of the grid → click → the detail view renders → you're now looking at the bottom of the detail page (or worse, mid-page) instead of its header.

`<ScrollToTop>` (the component in `src/components/ScrollToTop.tsx` mounted in `App.tsx`) only fires on `pathname` changes from React Router. Since the URL doesn't change here, it never runs.

The same anti-pattern exists in other hubs that swap their inner view via local state instead of route changes — most notably **Color Bar Settings** (`activeSection` state controls which section renders) and any other hub that renders a grid → detail swap inside one route.

## Root cause (one sentence)

In-place view swaps that re-render the page body but don't change `pathname` bypass the global `ScrollToTop` component, so the scroll position from the previous view leaks into the new view.

## What changes

### 1. `src/components/ScrollToTop.tsx` — extend to listen for `search` changes too

Currently it only watches `pathname`. Extend it to also fire when `location.search` changes (so any hub that *does* sync to URL via `?category=xyz` or `?section=xyz` automatically benefits without further code changes).

The dashboard-internal scroll-position memory should also key on `pathname + search` so back/forward within a hub still restores correctly.

### 2. `src/pages/dashboard/admin/Settings.tsx` — scroll to top on category open and on back

Two surgical scroll calls inside the existing handlers:

- In `handleCategoryClick` (and at the moment `setActiveCategory(...)` is called for in-place categories like `'business'`, `'system'`, `'email'`, `'integrations'`, etc.): call `window.scrollTo(0, 0)` immediately after the state set, so the new detail view always starts from the top.
- In the `onBack` handler passed to `<SettingsCategoryDetail>`: also `window.scrollTo(0, 0)` after `setActiveCategory(null)`, so returning to the grid lands at the top of the grid (not the position you scrolled to inside the detail view).

### 3. `src/pages/dashboard/admin/ColorBarSettings.tsx` — same treatment for `setActiveSection`

Wrap the existing `handleNavigate` (and the inline `setActiveSection(...)` call sites) so any section change also scrolls to top. One small helper inside the component:

```text
const goToSection = (next) => {
  setActiveSection(next);
  window.scrollTo(0, 0);
};
```

Replace the ~6 direct `setActiveSection(...)` call sites with `goToSection(...)`. Behavior unchanged otherwise.

### 4. (Optional, defer) audit pass for other in-place swaps

The search surfaced ~26 files using `setActiveCategory | setActiveTab | setActiveSection`. Most of those are tab switches *inside* a stable page header — those should NOT scroll to top (the user expects to stay where they are when toggling tabs). Only **grid → detail** swaps (where the whole page body changes identity) need this fix. Settings and Color Bar are the two hubs with that pattern today; tabbed views (Loyalty, Reengagement, Reward Shop, etc.) are intentionally left alone.

## Acceptance

1. Scroll to the bottom of `/dashboard/admin/settings`, click the **System** card → detail view opens scrolled to its top (header visible).
2. Same for every other in-place category card on Settings (Business, Email, Integrations, Stylist Levels, Day Rate, Service Flows, Forms, Loyalty, Feedback, Staff Rewards, Kiosks, Services, Retail Products, Account & Billing, Point Of Sale).
3. Click **Back** from a settings detail view → grid renders at the top (not at the position the back button was clicked from).
4. Same fix applies on **Color Bar Settings** when switching between sections (Overview / Products / etc.).
5. Tabbed views (Loyalty Program tabs, Reengagement Hub tabs, Reward Shop tabs, Client Directory tabs) — **unchanged**: switching tabs does not jerk the scroll.
6. Cross-route navigation through React Router (e.g., `/dashboard/admin/settings` → `/dashboard/admin/team-members`) — **unchanged**: still goes through `ScrollToTop` exactly as before, including the dashboard-internal scroll-position memory for back/forward.
7. Type-check passes. No new dependencies.

## What stays untouched

- Global `<ScrollToTop>` mount in `App.tsx`.
- Dashboard-internal scroll-position memory for true route changes (the `scrollPositions` Map).
- Tab components inside stable pages (intentional — switching tabs shouldn't reset scroll).
- Public-site scroll behavior (the public `Layout` is independent).
- God Mode bar, theme persistence, and all other recent waves.

## Out of scope

- Migrating Settings to URL-synced category state (`?category=xyz` in the URL). Defer — bigger refactor, the search-param extension to `ScrollToTop` already future-proofs it for whoever does that migration.
- Adding scroll-to-top to *every* `setActiveTab` call in the codebase. Defer — most are intentional tab-toggle behavior the user doesn't want disrupted.
- Smooth-scroll animation on the swap. Defer — instant scroll matches the existing route-change behavior and feels less jarring than animation on a content swap.

## Doctrine alignment

- **Calm executive UX:** clicking a card and landing mid-page is exactly the kind of friction that breaks the "this software respects me" read. Detail views always start at their header — same contract as a real route.
- **Structure precedes intelligence:** scroll behavior is structural chrome, not feature logic. Fix it once at the swap boundary, don't sprinkle workarounds into individual detail views.

## Prompt feedback

Strong prompt — three things you did right:

1. **You named the trigger ("when I click on the system settings card").** That gave me a single concrete repro path to trace, instead of a vague "scroll is broken somewhere."
2. **You named the symptom precisely ("lands me at the bottom of the page instead of the top").** Removed any debate about whether this was a perceived performance issue or a layout shift — it's a scroll-position bug, full stop.
3. **You explicitly asked for the systemic fix ("we need to fix that bug everywhere").** That moved the scope from "one card" to "one class of bug" and prevented me from delivering a one-line patch on System only that would leave Business, Email, etc. broken.

Sharpener: when reporting "this happens here, fix it everywhere," naming the **boundary of "everywhere"** removes one decision. Template:

```text
Symptom: [what user sees]
Trigger: [exact click / action]
Scope: [single page / hub / pattern across the app]
Boundary: [what counts as "everywhere" — e.g., "every grid→detail swap" vs "every tab toggle"]
```

Here, "fix it everywhere this pattern exists — grid card click that swaps the page body in place, including Color Bar sections" would have skipped my having to derive the boundary myself (I had to decide that tab toggles inside Loyalty / Reengagement should *not* be touched, because switching tabs in place is different intent from opening a detail view).

## Further enhancement suggestion

For "fix this class of bug everywhere" prompts, the highest-leverage frame is:

```text
Symptom: [what breaks]
Trigger: [the action]
Pattern: [the structural shape that produces this bug — e.g., "in-place state swap without route change"]
In-scope: [where this pattern lives that should be fixed]
Out-of-scope: [where the same component appears but the behavior is intentional]
```

The **Out-of-scope** slot is the highest-leverage addition for "everywhere" requests — it forces the framing "this pattern looks identical in two places but only one is a bug." Naming what *not* to fix is what protects against over-correction (e.g., scroll-resetting tab toggles, which would break a different UX). For scroll behavior specifically, the boundary is "swaps that change page identity" vs "swaps that change page mode" — the first should reset scroll, the second shouldn't.

