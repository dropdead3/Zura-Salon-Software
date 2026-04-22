
# Match Operations Hub tooltip spacing to Schedule's

## Root cause

Schedule and Operations Hub both render compact icons in the collapsed sidebar, but their **tooltip trigger boxes** are different widths:

- **Schedule** (`SidebarNavContent.tsx` line 329-353, `NavLink`): trigger has `px-2 py-2.5 mx-2`, no forced width — the `<a>` shrinks to its icon, ~36px wide, centered in the row.
- **Operations Hub** (`CollapsibleNavGroup.tsx` line 197-211, single-item collapsed branch): same padding/margin **plus** `style={{ width: 'calc(100% - 16px)' }}` — the `<a>` stretches across nearly the full sidebar width.

Radix Tooltip anchors `side="right"` to the **right edge of the trigger's bounding box**, not to the visible icon. With the same `sideOffset={8}`, Schedule's tooltip starts ~8px past a narrow centered pill (well off the rail) while Operations Hub's tooltip starts ~8px past a wide pill whose right edge nearly touches the rail bezel — producing the cramped visual gap in the screenshot.

## The fix

Remove the inline `width` style on the Operations Hub trigger so its bounding box shrinks to match Schedule's icon-sized pill. Same `sideOffset` then produces the same visual gap. No primitive change, no offset change, no other component affected.

### Edit — `src/components/dashboard/CollapsibleNavGroup.tsx`

In the `isCollapsed && items.length === 1` branch (the single-item collapsed link, ~lines 188-211):

- Remove `style={{ width: 'calc(100% - 16px)' }}` from the `<a>` (line 204)
- Add `mx-auto` to the className so the now-compact pill stays centered in its row

The `px-2 py-2 mx-2 rounded-lg` classes already produce a pill that sizes to the icon — exactly Schedule's behavior. Once the forced width is gone, the bounding box will be ~36px wide and the `sideOffset={8}` already on the `TooltipContent` (line 209) will render the tooltip with the same gap operators see for Schedule.

## What stays untouched

- `src/components/ui/tooltip.tsx` — unchanged
- Schedule, Command Center, Appointments and Transactions — unchanged (already correct)
- The multi-item collapsed group button (line 215+) and any other call sites with `width: calc(100% - 16px)` — **not touched in this pass**. The user's request was specifically Operations Hub. If other grouped icons exhibit the same defect, a follow-up pass can apply the same fix; not bundling them keeps this change atomic and easy to verify.
- All `sideOffset={8}` values — unchanged
- The active-state styling, hover state, icon, label, route — unchanged

## Files affected

- `src/components/dashboard/CollapsibleNavGroup.tsx` — 1 inline `style` removed, `mx-auto` added to className. ~2 lines modified.

Total: ~2 lines modified, 0 files created, 0 logic changes.

## Acceptance

1. Collapse the sidebar. Hover **Operations Hub** — the tooltip appears with the **same gap** between icon and tooltip bubble as **Schedule**.
2. The Operations Hub icon itself remains centered in its row (no leftward shift).
3. Schedule, Command Center, Appointments and Transactions tooltip spacing is unchanged.
4. Operations Hub's active-state background (when it's the current route) still renders as a pill around the icon, not a stretched bar.
5. Hover behavior on Operations Hub (click → navigate) is unchanged.

## Prompt feedback

Excellent prompt — a textbook example of how to report a spacing bug. Three things made it land in one pass: (1) you named the **target** ("Operations Hub icon"), (2) you named the **reference** ("equal to Schedule"), and (3) you uploaded **two screenshots showing both states side-by-side**. The matched-pair-with-reference framing is the strongest possible prompt shape for "this looks wrong vs that" bugs — it converts an open-ended "fix the spacing" task into a closed-ended "make A match B" task. There's no judgment call left for me to make about what the right gap *should* be; the answer is "whatever Schedule has."

The sharpener: you've now landed two consecutive prompts using this exact pattern (the previous one was "Command Center / Schedule / Appointments are correct, others aren't"). That's a repeatable template worth naming for yourself: **"[broken thing] should match [working thing]"**. Anytime you spot visual inconsistency, lead with that sentence — it short-circuits an entire round of "what's the right value?" reasoning. You already know the right value: it's whatever the working instance has.

The deeper meta-lesson on my side: the previous broader plan tried to fix every collapsed-sidebar trigger at once and proposed changes across five files. That was the wrong scope. When the user reports one specific instance ("Operations Hub"), the right move is to fix **that one instance** and let them flag the next one if it still bothers them. Bundling fixes feels efficient but actually slows verification — operators can't tell whether the fix worked when five things changed simultaneously. One symptom → one fix → one acceptance check. If the same defect exists elsewhere, the user will say so, and the fix template (remove `width: calc(100% - 16px)`, add `mx-auto`) is now obvious enough to apply without re-deriving it.
