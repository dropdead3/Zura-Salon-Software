
# Shift the Operations Hub tooltip off the rail by fixing the actual render path

## What’s actually wrong

You’re right: it is still touching the rail.

The previous change targeted `CollapsibleNavGroup.tsx`, but **Operations Hub is not coming from that path in the current collapsed sidebar**. In this build, the collapsed sidebar renders non-main sections through `SidebarNavContent.tsx`, and the collapsed single-item section link still has a forced wide trigger:

- `src/components/dashboard/SidebarNavContent.tsx` lines ~673-703
- collapsed single-item section branch
- `<a>` still has `style={{ width: 'calc(100% - 16px)' }}`

That means Radix is still anchoring the tooltip from the right edge of a wide invisible box, so the tooltip appears glued to the nav rail even with `sideOffset={8}`.

## What ships

A one-file, actual-path fix in `src/components/dashboard/SidebarNavContent.tsx`.

### Edit 1 — fix the collapsed single-item section trigger

In the `isCollapsed && sectionId !== 'main'` branch, inside:

```tsx
if (filteredItems.length === 1) { ... }
```

update the `<a>` trigger for the single-item section icon:

- remove `style={{ width: 'calc(100% - 16px)' }}`
- change the trigger from a row-width flex box to a compact centered trigger:
  - `flex` → `inline-flex`
  - `mx-2` → `mx-auto`

Target result:

```tsx
className={cn(
  "inline-flex items-center justify-center px-2 py-2 mx-auto rounded-full",
  ...
)}
```

This makes the trigger shrink to the icon pill, so the tooltip anchor moves left to the icon’s real edge and the bubble visually shifts right away from the rail.

## Why this is the right fix

- **Schedule** already works because its collapsed link is compact and centered.
- **Operations Hub** is still wrong because its actual trigger is still wide in `SidebarNavContent.tsx`.
- Increasing `sideOffset` globally is unnecessary and would move correct tooltips too.
- The issue is not tooltip padding; it is **trigger geometry on the real code path**.

## What stays untouched

- `src/components/ui/tooltip.tsx` — unchanged
- `sideOffset={8}` — unchanged
- `CollapsibleNavGroup.tsx` — untouched in this pass
- Schedule / Command Center / Appointments & Transactions — untouched

## Files affected

- `src/components/dashboard/SidebarNavContent.tsx` — remove one inline width style, swap to compact centered trigger. ~2 lines modified.

## Acceptance

1. Collapse the sidebar.
2. Hover **Schedule** — note the current gap.
3. Hover **Operations Hub** — the tooltip now opens with the **same breathing room** from the rail as Schedule.
4. The Operations Hub icon remains centered.
5. Active-state styling still appears as a compact pill, not a stretched bar.

## Prompt feedback

Good correction. “It’s literally still touching it. Shift it right” is useful because it rejects the false-positive fix immediately and states the visual outcome in plain language.

Stronger version for next time:
- “You changed the wrong render path.”
- “Operations Hub still touches the rail.”
- “Match the exact tooltip gap Schedule has.”

That framing does three things faster:
1. tells me the previous fix missed,
2. names the still-broken target,
3. reasserts the working reference standard.

## Further enhancement suggestion

When a visual fix fails, the highest-leverage follow-up is:
- **what is still wrong**
- **which reference is correct**
- **whether the previous change hit the wrong component**

That pattern turns a retry into a precise diff instead of a second guess.
