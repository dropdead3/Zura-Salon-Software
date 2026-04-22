
# Normalize collapsed-sidebar tooltip anchoring to match the working nav items

## What's right vs what's wrong

The user confirmed the **reference standard**:

- ✅ **Command Center**, **Schedule**, **Appointments and Transactions** — tooltips sit correctly off the rail
- ❌ Everything else (grouped sections like Operations Hub, START HERE, beta badge, Clock In, Lock Dashboard, Request a Feature, Report a Bug, Help Center) — tooltips collide with the nav bar edge

The three working items are top-level single nav links rendered through one code path. The broken items are rendered through different code paths that each force a wider trigger box (`w-full`, `width: calc(100% - 16px)`, `flex-1`, or full-width wrapper divs). Because Radix tooltips anchor to the trigger's bounding box, a wider invisible trigger pushes the tooltip closer to the nav rail edge — even with `sideOffset={8}`.

The fix is to make every other collapsed trigger match the geometry of the working three: a compact, icon-sized, centered button with no forced width.

## What ships

A trigger-geometry pass on five files. No primitive changes, no `sideOffset` changes, no copy changes.

### 1. `src/components/dashboard/CollapsibleNavGroup.tsx`

Both the collapsed direct-link button (line ~140) and the collapsed group button (line ~200) currently use `style={{ width: 'calc(100% - 16px)' }}`. Remove the inline width style on both and let the button size to its content (it already has `p-2.5` and a fixed icon). Center the button in its row with `mx-auto`.

This brings Operations Hub and every other grouped collapsed entry into alignment with Command Center.

### 2. `src/components/dashboard/SidebarNavContent.tsx`

Three collapsed trigger sites still force wide hit areas:

- **START HERE button** (~line 393): remove forced width, make `inline-flex` + `mx-auto`
- **Beta badge wrapper** (~line 474): wrap the badge in a `w-fit mx-auto` container so the tooltip anchors to the badge, not the row
- **Generic collapsed nav-item wrapper** (~line 702 / ~line 856): if the `TooltipTrigger` wraps a `relative` div spanning the row, swap to wrapping just the icon button

The three working items (Command Center / Schedule / Appointments) stay untouched — they're the pattern we're matching.

### 3. `src/components/dashboard/SidebarFeedbackButtons.tsx`

The collapsed pill stack still stretches children across the cross-axis. Add `items-center` to the collapsed `flex-col` container, and add `self-center` to each of the three buttons so they shrink to icon-square size. Keep expanded behavior unchanged (`flex-1` only when not collapsed).

### 4. `src/components/dashboard/SidebarClockButton.tsx`

The collapsed button class still includes `w-full`. Make `w-full` conditional — only when expanded. Collapsed state uses no width utility (button sizes to its icon).

### 5. `src/components/dashboard/SidebarLockButton.tsx`

Same fix as the Clock button — remove `w-full` from collapsed state, keep it for expanded.

## What stays untouched

- `src/components/ui/tooltip.tsx` — unchanged
- `sideOffset={8}` — unchanged across all sites (the offset is fine; the trigger width was the problem)
- Command Center / Schedule / Appointments and Transactions — explicitly untouched (they're the reference)
- Expanded sidebar layout — unchanged for all five files
- Labels, icons, routes, permissions — unchanged

## Files affected

- `src/components/dashboard/CollapsibleNavGroup.tsx` — 2 width-style removals + 2 `mx-auto` additions
- `src/components/dashboard/SidebarNavContent.tsx` — 3 trigger-wrapper geometry swaps
- `src/components/dashboard/SidebarFeedbackButtons.tsx` — container `items-center` + per-button `self-center`
- `src/components/dashboard/SidebarClockButton.tsx` — conditional `w-full`
- `src/components/dashboard/SidebarLockButton.tsx` — conditional `w-full`

Total: ~12 lines modified, 0 files created, 0 logic changes.

## Acceptance

1. Collapse the sidebar. Hover **Command Center**, **Schedule**, **Appointments and Transactions** — tooltips appear with the same gap they have today (the reference, unchanged).
2. Hover **Operations Hub**, **START HERE**, the **beta badge**, **Clock In**, **Lock Dashboard**, **Request a Feature**, **Report a Bug**, **Help Center** — tooltips now appear with the **same gap** as the three reference items. None visually touch the nav rail.
3. The three feedback icons in the bottom pill render as compact squares centered in the pill (no longer stretched across its width).
4. Clock and Lock buttons render as compact pills centered in their row, not full-width bars.
5. Expanded sidebar behavior is unchanged for all five components.

## Prompt feedback

Excellent prompt. You did the single highest-leverage thing possible for a "fix this spacing inconsistency" report: **you named the reference standard by example** ("Command Center, Schedule, Appointments and Transactions are correct; everything else is wrong"). That instantly converts an open-ended cosmetic problem into a closed-ended pattern-matching problem — find what those three share, apply it everywhere else. Without that sentence, my last plan tried to derive the right spacing value from screenshots and landed on `sideOffset={8}` as the fix; with it, the diagnosis flips to "the offset is already fine, the trigger geometry is what differs" — which is the actual root cause.

The sharpener: when the bug is "some instances of X work, others don't," leading with **"these specific ones are correct, match them"** is the strongest possible framing. You did that here. Next time you spot the same shape of bug (some buttons styled right, some not; some tooltips spaced right, some not; some cards aligned, some not), use the same template: *"[these specific ones] are correct, [these other ones] aren't, make them match."* That single sentence eliminates an entire round of "what's the right value?" reasoning.

The deeper meta-lesson on my side: when the previous fix didn't land, my instinct was to increase the offset. That instinct was wrong. The right move was to ask *"why do some sites with the same offset look correct and others don't?"* — and the answer is always trigger geometry, not offset. Same pattern as the SURFACE_META audit and the Radix `description` prop fix: when one knob doesn't move the needle, the issue is upstream. Stop turning the knob, look at what feeds it. Three working nav items + eleven broken ones with the same `sideOffset` is a screaming signal that the differing variable is somewhere else (here: `w-full`, inline width styles, `flex-1` stretching). Audit the variable that *differs* between working and broken, not the variable that's *shared*.
