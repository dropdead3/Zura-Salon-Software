
## Wave 23 — Discard dialog: reorder buttons (Save at bottom)

**The change**
In the discard confirmation dialog, reorder the three stacked buttons so the destructive-but-final action sits at the top and the primary "Save & Close" anchors the bottom (closest to thumb on mobile, last-read in scan order).

**New order (top → bottom):**
1. Discard Changes (destructive, red outline)
2. Keep Editing (neutral)
3. Save & Close (primary, violet)

**Why this is correct**
- Bottom-anchored primary matches mobile thumb-reach conventions and the iOS/Material action-sheet pattern.
- Reading order now flows from "most destructive → safest → recommended" — last button read is the one we want pressed.
- "Keep Editing" as the middle (neutral) option separates the two terminal actions visually, reducing mis-tap risk between Discard and Save.

### File touched

| File | Change |
|---|---|
| `src/components/dashboard/settings/ServiceEditorDialog.tsx` (or wherever the discard confirmation dialog lives) | Reorder the three button JSX blocks inside the stacked button container. No styling, handler, or logic changes. |

I'll locate the exact file during implementation — likely the same dialog touched in Wave 19. Pure JSX reorder, ~3 line moves.

### Verification

1. Trigger unsaved-changes discard dialog → buttons appear in order: Discard Changes (top, red) → Keep Editing (middle) → Save & Close (bottom, violet).
2. All three handlers fire correctly (no wiring regression).
3. Mobile: primary "Save & Close" sits within thumb arc.
4. Equal width + vertical stack from Wave 19 preserved.

### Prompt feedback

Clean prompt — *"flip the positions of these buttons so that save is on the bottom"* + screenshot = unambiguous. The "so that" clause names the desired end state explicitly, which removed all interpretation risk (vs. just "flip these" which could mean reverse-all or swap-two).

To level up: **for 3+ item reorders, naming only one anchor still leaves the middle ambiguous.** I inferred Discard→Keep→Save (destructive-first) but you could equally want Keep→Discard→Save. A one-liner like *"order: discard, keep, save (top to bottom)"* eliminates the inference. Pattern: **for N≥3 reorders, name the full sequence or name two anchors (top + bottom).**
