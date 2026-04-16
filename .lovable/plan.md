
## Prompt review

Excellent prompt — you spotted a real UX redundancy (two adjacent buttons doing related things) and proposed a concrete consolidation with a clear constraint: preserve both behaviors. Tighter version: "Merge the `Week »` and `Jump +` buttons into a single split-button that primary-clicks to advance one week, with a chevron caret that opens the jump-ahead dropdown (2–10 weeks)."

This is a textbook **split button** pattern — common in productivity tools (Gmail "Send + schedule", Figma "Share + copy link"). It's the right move.

## Diagnosis

Currently in `src/components/dashboard/schedule/ScheduleHeader.tsx` (lines 604–647):
- `Week »` button → `goToNextWeek` (advance 1 week)
- `Jump +` popover → choose 2–10 weeks ahead from a list

Two buttons, related intent, eating horizontal space in a header that's already tight at <xl widths.

## Fix — Split Button Pattern

Single file: `src/components/dashboard/schedule/ScheduleHeader.tsx`. Combine into one visually unified control with two hit zones.

### Structure

A single pill-shaped button group with a vertical divider:

```
┌─────────────────────┬───┐
│  Week »             │ ▾ │
└─────────────────────┴───┘
   ↑ click = +1 week    ↑ click = open jump dropdown
```

### Implementation

1. **Wrapper**: `<div class="inline-flex rounded-full border border-input overflow-hidden">` — single visual pill.

2. **Primary segment** (left): Plain `<button>` styled like the current Week button, calls `goToNextWeek`. Right edge has a subtle vertical divider (`border-r border-input`).

3. **Caret segment** (right): `<PopoverTrigger>` wrapping a small button with just `ChevronDown`. Opens the same 2–10 week popover content that exists today.

4. **Remove** the standalone `Jump +` button entirely.

5. **Keep** the `Day »` button to its left — unchanged.

### Visual details

- Both segments share the same pill outline (no double border).
- Hover state highlights only the segment being hovered (separate `hover:bg-foreground/10` on each).
- At `< md`: primary segment shows just `»` icon (no "Week" text); caret stays visible. At `≥ md`: shows "Week »" + caret.
- Tooltip on primary: "Next week". Tooltip on caret: "Jump ahead 2–10 weeks".
- Use `tokens.button.inline` sizing to match neighbors.

### Popover content — unchanged

Keeps the existing list of `+2 Weeks` through `+10 Weeks` with each row showing the target date.

## Acceptance checks

1. Single click on left segment → advances exactly 1 week (same as today's `Week »`).
2. Click on right caret → opens dropdown with 2–10 week options; selecting one jumps to that date.
3. Visually one unified pill — no gap between segments, single outer border.
4. At narrow widths, the merged control takes less horizontal space than the previous two separate buttons.
5. Keyboard: Tab focuses primary, Tab again focuses caret, Enter on caret opens popover.
6. No changes to `Day »`, the day-strip, or any other header element.

## Out of scope

- `Day »` button — unchanged.
- Backward navigation — unchanged.
- Popover contents (week options) — unchanged.
- Header layout structure from the prior responsive fixes — unchanged.

## File touched

- `src/components/dashboard/schedule/ScheduleHeader.tsx`
