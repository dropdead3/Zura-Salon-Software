
## Prompt review

Clear, atomic prompt. You named the two elements, the visual goal (same style/color), and the responsive behavior (stack when condensed). A slightly tighter version: "Make the `Shifts` and `Date` buttons in the Schedule header visually identical (same pill style, same color treatment). At < `xl`, stack them vertically; at `xl+`, keep them inline." — that explicitly names the breakpoint so the implementation has zero ambiguity.

## Diagnosis

In `src/components/dashboard/schedule/ScheduleHeader.tsx` (left cluster, lines 156–248):

- **Shifts button** (lines 192–221) — custom pill: `rounded-full px-3 py-1.5 text-sm`, with active/idle color treatment using `sidebar-foreground/50` idle state, icon left of label.
- **Date button** (lines 223–247) — shadcn `Button variant="ghost" size="sm"`: different padding, different idle color (`sidebar-foreground/70`), no rounded-full pill, icon styling differs.

They visually disagree: different shape, different idle opacity, different hit-target. They're the same conceptual class (secondary toggles/triggers next to the Day/Week pill), so they should match.

## Fix

Single file: `src/components/dashboard/schedule/ScheduleHeader.tsx`. Pure className changes. No logic, no token changes, no behavior changes.

### 1. Unify Date button to match Shifts pill style

Replace the shadcn `Button` wrapper (lines 225–232) with the same `<button>` pill used for Shifts:
- `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all duration-200`
- Idle: `text-[hsl(var(--sidebar-foreground))]/50 hover:text-[hsl(var(--sidebar-foreground))]/80 hover:bg-[hsl(var(--sidebar-accent))]`
- Icon `h-3.5 w-3.5` (matches Shifts icon size)
- Keep the Popover wiring intact

### 2. Stack Shifts + Date vertically when condensed

Wrap the Shifts button + Date popover in a sibling group `<div>`:
- At `< xl`: `flex flex-col gap-1 items-start`
- At `xl+`: `flex flex-row gap-3 items-center` (current inline behavior)

Result:
- **Wide (xl+)**: `[Day|Week] · Shifts · Date` inline — visually identical to today's wide layout.
- **Condensed (<xl)**: `[Day|Week]` then a small stacked column with `Shifts` on top and `Date` below — both as matching pills.

### 3. Optional hover/active consistency

Shifts button's "active" state (when shifts view is on) keeps its filled-pill treatment. Date has no active state, so it stays in idle pill style — that's fine and expected.

## Acceptance checks

1. Shifts and Date buttons render identical pill shape, padding, idle color, and icon size.
2. At viewport `≥ 1280px (xl)`: both pills sit inline next to the Day/Week toggle — visually matches current wide layout.
3. At viewport `< 1280px`: Shifts pill stacks above Date pill in a tight vertical group.
4. No change to Day/Week toggle, popovers, or any handler logic.
5. Date popover still anchors correctly to its trigger.

## Out of scope

- Wide-screen (≥ xl) overall layout — unchanged.
- Right cluster (filters, selectors) — unchanged.
- Secondary nav bar — unchanged.
- Any color/token system additions.

## File touched

- `src/components/dashboard/schedule/ScheduleHeader.tsx`
