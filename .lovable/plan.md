## Goal

Make the **Live Preview** in the Calendar Appearance section render with the **exact same visual language** as the real Schedule (`/dashboard/schedule` Week view). Today the preview uses its own ad-hoc grid and paints raw `color_hex` — so it ignores the active dashboard theme, dark mode, and the schedule's actual block/break treatment. Result: pale washed-out tiles, mismatched headers, and a "BR" chip that looks nothing like the amber Break overlay on the real calendar.

## Scope

One file to refactor, one shared helper to lean on. No schema changes.

- `src/components/dashboard/settings/CalendarColorPreview.tsx` — full visual rebuild against the WeekView reference.

The real schedule files (`WeekView.tsx`, `AppointmentCardContent.tsx`, `BreakBlockOverlay.tsx`) remain untouched — the preview pulls from the same color/theme helpers they already use so it stays in lockstep.

## What changes (visual parity checklist)

### 1. Theme + dark-mode awareness (root cause of the pale-yellow look)
- Read `useDashboardTheme()` to know `isDark`.
- For each sample appointment, run `boostPaleCategoryColor` + `deriveLightModeColor` (light) or `getDarkCategoryStyle` (dark) — exactly the pipeline `AppointmentCardContent` uses.
- Result: the preview blonding tile turns the same butterscotch as the real schedule in light, and the same warmer amber-on-dark in dark mode (instead of the washed `#fef9c3`).

### 2. Header chrome — mirror WeekView header
- Frosted `bg-muted/95` + `backdrop-blur-xl` sticky header.
- Day-of-week label: `font-display uppercase tracking-wider text-[10px]`.
- Day number: `text-xl font-medium`, with an active "today" pill (`bg-foreground text-background min-w-[36px] h-9 rounded-full`).
- Sub-line: `"{n} appts"` like the real header (computed from sample data).
- Border separators: `border-l border-border/50`, `border-b border-border/50`.

### 3. Time gutter
- Widen from 48px → 70px, paint with `bg-sidebar` (matches WeekView).
- Hour labels right-aligned, `text-xs`, `font-medium` on the hour, muted half-hour stub.

### 4. Day columns
- Today column: `bg-primary/5` (matches WeekView).
- Hour separators: `border-b border-border` (not `/30`) so the rhythm matches.

### 5. Appointment cards — full schedule chrome
- `rounded-lg` (not `rounded-sm`), `border-l-4`, `shadow-sm` → `hover:shadow-md hover:brightness-[1.08]`.
- Status badge top-right (sample uses "Booked" pastel from `APPOINTMENT_STATUS_BADGE`).
- NC/RC chip bottom-right for two of the sample appointments (one new, one returning) — same amber/blue pill the real cards render.
- Indicator cluster slot reserved (we'll show one new-client sparkle on the Tuesday consultation to demonstrate).
- Multi-service band: keep one sample (Olivia K.) with a band split to show how the band logic visualizes.
- Gradient categories: keep the existing shimmer + glass-stroke overlay (already faithful).

### 6. Block / Break — match BreakBlockOverlay
- Drop the "use the category's own color + diagonal X" treatment.
- Render Block/Break with the canonical `BLOCK_TYPE_CONFIG` look:
  - Break/Lunch → `bg-amber-500/20 border-l-amber-500 text-amber-900 dark:text-amber-200`, Coffee icon.
  - Block → `bg-muted/40 border-l-muted-foreground/30 text-muted-foreground`, Moon icon.
- Drop the standalone "BR" chip floater — the overlay panel itself carries the icon + label.

### 7. Container
- Outer wrapper: `rounded-xl border border-border bg-card overflow-hidden` (matches WeekView's outer scroll shell).
- Internal grid: `gridTemplateColumns: '70px repeat(4, 1fr)'`.

## Technical notes

- All color/theme logic is **imported**, not duplicated. The preview becomes a thin reskin around the same helpers the real schedule uses — so any future tweak to `getDarkCategoryStyle` / `deriveLightModeColor` / `BLOCK_TYPE_CONFIG` automatically flows through.
- Sample data stays in-component (no DB hit). 4 days × ~4 appointments. Times keep the existing 9a–5p window.
- No new dependencies, no token additions. Uses existing `tokens.label.tiny` etc. for the surrounding labels.
- Component remains pure render — no queries, no context other than `useDashboardTheme()`.

## Acceptance check

Side-by-side with `/dashboard/schedule` (week view) on Drop Dead's current theme + dark mode:
1. A "Blonding" tile in the preview is the same hue as a real Blonding appointment.
2. A "Break" tile is amber with a Coffee icon — not pale yellow with an X.
3. A "Block" tile is muted-grey with a Moon icon.
4. Today column tinted `bg-primary/5`; today header pill matches.
5. Switching the active theme (Zura → Rose Gold → Jade) shifts both surfaces identically.
6. Toggling dark mode shifts both surfaces identically.

## Files edited

- `src/components/dashboard/settings/CalendarColorPreview.tsx` (full rewrite, ~200 lines)

## Out of scope

- No changes to actual Schedule rendering, color helpers, or category data shape.
- Preview keeps its 4-day Mon–Thu sample window; we're not adding interactivity.

---

### Prompt feedback (per project doctrine)

Strong instinct: framing the preview as a contract that must mirror live behavior is the right call — divergence here is an alignment bug, not a styling preference. Two ways to make this kind of prompt land even faster next time:

1. **Anchor to the source of truth explicitly.** "Match WeekView + BreakBlockOverlay exactly, including dark-mode treatment" tells me which files to diff against and removes the guesswork about whether you want a "close enough" rework or pixel parity.
2. **Call out the failure modes you can already see.** "Pale yellow tiles, BR chip floats outside the block, header doesn't match" gives me the test cases up front, so I can structure the plan around them and you can verify in the same order.

### Enhancement suggestions (post-plan)

- **Theme hot-swap demo** — add a tiny inline theme switcher above the preview so operators can audit how each saved theme renders without leaving Settings. Low cost, high "wow" for owners onboarding multi-location brands.
- **Density toggle** — preview at "compressed" / "default" zoom levels so operators see how their colors hold up at the densities their managers actually use.
- **Lock-step contract test** — a tiny `__tests__/CalendarColorPreview.matches-week-view.tsx` that snapshots the same sample appointment rendered through both `CalendarColorPreview` and `AppointmentCardContent`, and fails CI if the resolved background hue diverges by more than a tolerance. Would prevent silent drift if `WeekView`'s color pipeline ever changes again.
