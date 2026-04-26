## Goal

Retire the double-click-to-hide gesture on monetary values. The `h` hotkey and the top-bar privacy toggle now own the "hide" path; the inline gesture is redundant and produces noisy `Double-click to hide` tooltips on every revealed amount (visible in the screenshot covering the Sales card).

The reveal path stays — when values are blurred, single-click still unblurs through `requestUnhide()` (with the existing confirmation dialog).

## Changes

### 1. `src/contexts/HideNumbersContext.tsx` — `BlurredAmount`
- Remove `handleDoubleClick`, `onDoubleClick`, and the `Double-click to hide` tooltip from the **revealed** branch.
- Drop the `cursor-pointer` class from the revealed span (no interaction = no pointer affordance).
- The wrapping `TooltipProvider` / `Tooltip` for the revealed state becomes unnecessary — render the bare `Component` (matching `disableTooltip` shape) so revealed numbers carry zero hover chrome.
- Keep the **blurred** branch untouched: single-click + Enter key still call `requestUnhide()`, tooltip still says `Click to reveal`.
- Remove `quickHide` from the destructure (no longer used here).

### 2. `src/components/ui/AnimatedBlurredAmount.tsx`
- Remove `handleDoubleClick` and the `onDoubleClick` handler on the span.
- Conditionalize the tooltip: render the `Tooltip` wrapper **only when `hideNumbers` is true** (`Click to reveal`). When revealed, return the bare `<span>` with no tooltip and no `cursor-pointer`.
- Remove `quickHide` from the destructure.

### 3. `src/contexts/HideNumbersContext.tsx` — context surface
- Remove `quickHide` from the `HideNumbersContextType` interface, the `quickHide` implementation (lines ~146), and the provider `value` object.
- This is safe: `rg quickHide src/` confirms only the two files above consume it.

### 4. Memory update — `mem://style/platform-ui-standards-and-privacy`
- Update the privacy section to reflect the canonical hide paths: top-bar toggle + `h` hotkey only. Remove any implication that double-click is a supported gesture. Note that revealed monetary values render with no hover affordance (no tooltip, no pointer cursor) — silence is the desired state.

## Out of scope

- The reveal flow (`requestUnhide()` + confirmation dialog) stays exactly as-is.
- The `h` hotkey, top-bar toggle, and `BlurredAmount`/`AnimatedBlurredAmount` API surfaces don't change for consumers.

## Verification

- Visual: hover over any `$X` value on the org dashboard → no tooltip, no pointer cursor.
- Toggle via `h` and the top-bar button still works in both directions.
- Click a blurred value → reveal confirmation dialog still appears.
- `rg quickHide src/` returns zero results after the change.