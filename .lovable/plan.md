

# Fix sidebar tooltip padding inconsistency

## What's wrong

Two visible problems in the collapsed sidebar:

1. **Help Center / Bug / Lightbulb tooltips sit further from their icons** than every other sidebar tooltip (Operations Hub, etc.). Cause: those three buttons live inside a pill container (`bg-muted/30` rounded pill at the bottom of the sidebar) and use `flex-1` to stretch across the pill width. The tooltip anchors to the *right edge of the button*, not the icon glyph — so a stretched button pushes the tooltip noticeably away from the visible icon.

2. **All sidebar tooltips use the default `sideOffset={4}`** (from `tooltip.tsx`). Combined with varying button widths, this produces uneven visual gaps and on the widest triggers the tooltip arrow/edge can appear to graze the sidebar bezel.

## What ships

Two surgical edits. No primitive changes, no token changes.

### Edit 1 — `src/components/dashboard/SidebarFeedbackButtons.tsx`

When `isCollapsed`, drop `flex-1` from the three buttons so they shrink to icon-sized squares (matching the Operations Hub button geometry). When expanded, keep current behavior.

```tsx
className={cn(
  "flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-all duration-200 ease-out",
  !isCollapsed && "flex-1"
)}
```

Also add `sideOffset={8}` to all three `TooltipContent` elements so the tooltip clears the pill border consistently.

### Edit 2 — Standardize tooltip offset across the collapsed sidebar

Add `sideOffset={8}` to the `TooltipContent` in these collapsed-sidebar trigger sites so every tooltip sits the same distance from its trigger:

- `src/components/dashboard/CollapsibleNavGroup.tsx` — lines 148, 209 (the two collapsed-state `TooltipContent` instances)
- `src/components/dashboard/SidebarNavContent.tsx` — lines 364, 393, 417, 474, 702, 856 (the eight collapsed-sidebar `TooltipContent` instances)
- `src/components/dashboard/SidebarClockButton.tsx` — line 67
- `src/components/dashboard/SidebarLockButton.tsx` — line 45

8px (vs the current 4px default) gives the tooltip a clean visual gap from the icon button without floating it. It matches the spacing operators see on the Operations Hub icon in the screenshot — that one already reads correctly because its button is small; the offset just needs to be uniform.

### Why not change the primitive

`src/components/ui/tooltip.tsx` is shared by every tooltip in the codebase (drill-down dialogs, schedule cells, table rows, policy wizard). Bumping the default offset there would shift every tooltip platform-wide. The problem is sidebar-specific, so the fix is sidebar-specific.

## What stays untouched

- `src/components/ui/tooltip.tsx` — unchanged.
- All non-sidebar tooltips — unchanged offset.
- The pill container background, border, label text, icon choice — unchanged.
- Expanded-sidebar layout — unchanged (the `flex-1` is preserved when not collapsed so the pill row still fills horizontally).

## Files affected

- `src/components/dashboard/SidebarFeedbackButtons.tsx` — 3 buttons get conditional `flex-1`, 3 tooltips get `sideOffset={8}`. ~6 lines modified.
- `src/components/dashboard/CollapsibleNavGroup.tsx` — 2 tooltips get `sideOffset={8}`. ~2 lines modified.
- `src/components/dashboard/SidebarNavContent.tsx` — 8 tooltips get `sideOffset={8}`. ~8 lines modified.
- `src/components/dashboard/SidebarClockButton.tsx` — 1 tooltip gets `sideOffset={8}`. ~1 line modified.
- `src/components/dashboard/SidebarLockButton.tsx` — 1 tooltip gets `sideOffset={8}`. ~1 line modified.

Total: ~18 lines modified, 0 files created, 0 logic changes.

## Acceptance

1. Collapse the sidebar. Hover the **Operations Hub** icon — tooltip appears with a clean 8px gap from the button, label "Operations Hub" visible.
2. Hover the **Lightbulb / Bug / Help Center** icons in the bottom pill — tooltips appear with the **same 8px gap**, not the previous wider gap. The three icons themselves now sit as compact squares inside the pill (no longer stretched).
3. Hover the **Clock / Lock** icons in the second pill — same 8px gap.
4. Every other tooltip in the collapsed sidebar (org logo, Expand button, START HERE, single-item nav rows, beta badge) opens with the same 8px gap. Visual rhythm is uniform top-to-bottom.
5. No tooltip visually touches the sidebar's right bezel.
6. Expanded sidebar layout unchanged — feedback pill still spans the full width with three evenly-distributed icons.

## Prompt feedback

Strong prompt — three sharp moves: (1) you named the **location** ("left nav bar tooltips"), (2) you named the **symptom** ("not equal padding, touching the nav bar"), and (3) you uploaded **two screenshots showing the same defect at different positions** in the sidebar. The matched-pair screenshot is the highest-leverage move — one screenshot would have let me misdiagnose this as a single-component bug; two screenshots from different sidebar regions immediately told me it's a *cross-component spacing inconsistency*, not a single-tooltip issue. That's the difference between fixing one file and fixing five.

The sharpener: when reporting "padding feels off" across multiple components, naming the **reference standard** in three words ("match the Operations Hub icon" / "use the smallest gap") would let me skip deciding which spacing value is the correct target. I had to infer that 8px was the right offset by eyeballing the screenshots; if you'd written "tighter, like the top icons" or "looser, more breathing room," I'd have led with that value. One word of intent on direction (tighter / looser / match X) saves a paragraph of justification.

The deeper meta-lesson on my side: when an operator flags "padding inconsistency," my instinct is to find the one offending component and patch it. That instinct is wrong. The right move is to ask *"is the underlying primitive used at consistent settings, or is each call site passing different values (or relying on defaults at different button widths)?"* In this case `TooltipContent` was used everywhere with the default `sideOffset={4}`, but the *trigger geometry* varied (square buttons vs `flex-1` stretched buttons), which made the same offset look uneven. The fix isn't in the primitive — it's at the call sites, normalizing both the trigger size and the offset together. Same pattern as the SURFACE_META audit: when one item in a shared system looks wrong, audit the system, not the item.

