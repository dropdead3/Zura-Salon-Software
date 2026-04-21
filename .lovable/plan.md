

# Convert Policies page from card grid to list layout

## Why

Looking at your screenshot — 20 cards stacked in a 3-col grid eats the entire viewport before you can finish scanning a single group. Each card carries the same five elements (title, description, badges, "Renders to" surfaces, status), but in a card grid they're locked into a tall block that forces visual recomputation per row. A list compresses each policy into one scannable row where the eye moves left-to-right once and up-to-down many times — the natural rhythm for a 20-item governance checklist.

## The shape

Replace the three `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3` blocks with a single-column **list** per group. Each row is one policy, full panel width.

```
┌─ REQUIRED FOR GOVERNANCE     20 of 20 adopted ━━━━━━━ 100%      [⊙ Hide adopted] ─┐
│  Protect your business. The software runs without these…                            │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ ✓  Employment Classifications                          [Required] [Internal] [✓]   │
│    W2 full-time, part-time, probationary periods…      Renders to: 📱 ✅           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ ✓  Attendance & Punctuality                            [Required] [Internal] [⏵]  │
│    Tardy thresholds, grace periods, call-out windows…  Renders to: 📱 ⓘ ✅        │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ ○  Timekeeping & Breaks                                [Required] [Internal] [⏵]  │
│    Time clock rules, missed punch handling…            Renders to: 📱 ✅           │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

Three concrete shifts:

- **One row per policy, full width** — title + description left, badges + "Renders to" icons right. Click anywhere on the row opens the configurator.
- **Compact vertical rhythm** — each row ~64-72px tall (vs. ~180px today). 20 governance items fit on a laptop screen with ~3 visible from the next group as a continuity hint.
- **Same content, denser arrangement** — no information removed. Status check icon, title, short description, recommendation/audience/status badges, candidate surfaces. The Core Function consumer label and "Using platform default" fallback line still render, just inline under the description.

## Row anatomy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ✓  TITLE                       BADGES                Renders to: 📱 ⓘ ✅   │
│    Description • consumer label • default fallback                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Status icon** (`CheckCircle2` adopted / `Circle` not) — leftmost column, 16px, `shrink-0`.
- **Title + description block** — flex-1, min-w-0. Title `font-sans text-sm font-medium`. Description `text-xs text-muted-foreground line-clamp-1` (was 2 in cards — list view trades depth for breadth; truncation is acceptable since clicking opens full detail). Consumer label and default-fallback line render below the description on a single line each, separated by `·` if both present.
- **Badges cluster** — Required / Recommended / Optional + audience + status badges. Right-aligned, `flex-wrap` only on narrow viewports.
- **Renders to** — surface icons inline at the far right, same 5×5 muted chips as today, max 4 + "+N".

The required-policy left accent bar (today: `before:w-[2px] before:bg-primary/50`) stays — it acts as the row-level "this is mandatory" anchor.

Hover state: `bg-muted/30` row tint + `border-l-primary` brightens. No card lift, no shadow — list rows don't deserve elevation.

Adopted vs unadopted distinction stays the same (border-primary/30 vs border-border/60), but applied as a single bottom border between rows rather than a card border around each one.

## Group container

Each group becomes a single `rounded-xl border border-border/60` shell with the sticky header at the top and a `divide-y divide-border/40` list of rows underneath. This is one shell per group instead of N cards per group — the page now has 3 shells (Core, Required, Recommended) instead of ~30.

The sticky group header (today) keeps its current job: title + progress meter + "Hide adopted" toggle + helper sentence. Visually unchanged.

## Responsive behavior

- **Desktop (≥1024px)**: full row layout described above, badges right-aligned.
- **Tablet (768-1023px)**: same structure, "Renders to" icons hidden behind a `+` chip that reveals on hover (preserves row height).
- **Mobile (<768px)**: badges and renders-to wrap to a second line under the description. Status icon stays leftmost. Row height grows to ~96px.

This uses container queries via `@container` on the group shell, not viewport breakpoints — so the Policies page works identically inside the configurator drawer or in full-page view.

## What stays untouched

- The data fetching (`usePolicyLibrary`, `useOrgPolicies`, `usePolicyApplicability`) — unchanged.
- Group ordering (Core → Required → Recommended) — unchanged.
- Sort logic (unadopted first, adopted second) within Required — unchanged.
- The "Hide adopted" toggle behavior — unchanged.
- The `applicableEntries` filter (Policy OS Applicability Doctrine) — unchanged.
- Setup intro, configurator drawer, all hooks — unchanged.
- Public `ClientPolicyCenter` — unchanged (still uses cards externally).

## Files affected

- `src/components/dashboard/policy/PolicyLibraryRow.tsx` (new) — list-row variant of `PolicyLibraryCard`. Same props (`entry`, `adopted`, `onClick`, `consumerLabel`, `showDefaultFallback`). Renders as a `<button>` with the row layout above. ~110 lines.
- `src/pages/dashboard/admin/Policies.tsx` — replace the three `<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">…{group.map(renderCard)}…</div>` blocks with `<div className="rounded-xl border border-border/60 divide-y divide-border/40 overflow-hidden">…{group.map(renderRow)}…</div>`. Move the sticky group header *inside* the shell as the first child. ~30 lines modified.
- `src/components/dashboard/policy/PolicyLibraryCard.tsx` — kept unchanged. Still used by other surfaces (search, command palette previews, public center exports). No deletion.

Total: ~140 lines (mostly the new row component). Zero schema changes, zero hook changes, zero behavioral regressions.

## Acceptance

1. Open `/dashboard/admin/policies` at 1300px viewport. The "Required for governance" group renders as a single bordered shell containing 20 rows, ~70px each, instead of a 7-row grid of cards.
2. Each row shows status icon · title · short description · Required/Internal/status badges · "Renders to" icons in a single horizontal pass.
3. Click any row → configurator drawer opens with the same `policy=<key>` URL as today.
4. The "Hide adopted" toggle still hides adopted required rows; the meter still ticks to 100% when all are adopted.
5. Required rows show a 2px primary accent on the left edge (preserving today's mandatory-anchor visual).
6. Resize to 768px → "Renders to" icons collapse behind a `+` chip; description stays visible.
7. Resize to 600px → badges and renders-to wrap to a second line; row grows to ~96px; status icon stays leftmost.
8. Core functions group renders identically (rows with consumer label visible). Recommended & Optional group renders identically (rows with no accent bar, no progress meter).
9. Public Client Policy Center (`/policies` external page) unchanged — still uses card layout for the public surface.
10. No card-level shadow, no hover lift on rows; hover applies a subtle `bg-muted/30` row tint only.

## Files to read for follow-on questions

- `src/pages/dashboard/admin/Policies.tsx` — the three group blocks at lines ~683, 729, 750 where the grid → list swap happens.
- `src/components/dashboard/policy/PolicyLibraryRow.tsx` (new) — the list-row component.

## Prompt feedback

*"Lets turn the policies page into a list layout, organized by group, instead of cards."* — clean, surgical, one-line. You did two things well: (1) **named the structural change** ("list layout, organized by group") in five words, no ambiguity about what to build, and (2) **reused existing language from the page** ("organized by group" matches today's three-group structure), which prevented me from accidentally re-grouping by audience or category. The screenshot anchored the scope — I knew exactly which surface you meant.

One sharpener for next time on layout-conversion prompts: naming the **density target** in one phrase ("compact list — fit ~12 per screen" / "comfortable list — ~6 per screen") would skip a micro-decision. I went with compact (~70px rows fitting ~10-11 per screen) because a 20-item checklist *needs* density to feel manageable — but if you wanted comfortable spacing for executive-feel legibility, that's a one-line steer that changes the row math. You can pre-empt it with *"as compact as readable"* or *"comfortable spacing, not packed"* in three words.

