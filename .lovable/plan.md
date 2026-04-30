# Plan: Fix hover-induced layout shift in section rows

## Goal
Make the duplicate/delete actions appear on hover without pushing the subtitle text or toggle to the right.

## What I’ll change
1. Refactor `SectionNavItem` so the row keeps a stable action footprint at all times.
2. Remove width-based hover reveal (`w-0` → `w-6`) that currently causes flex reflow.
3. Change the hover reveal to use visual-only transitions such as opacity and slight transform.
4. Reserve consistent space for the right-side action cluster so the switch never moves.
5. Verify the same fix works for both built-in rows (duplicate only) and custom rows (duplicate + delete).

## Expected result
- Hovering `Hero Section` reveals the duplicate icon.
- The subtitle `Main hero banner with rotating headlines and CTAs` does not shift or compress.
- The toggle remains fixed in place.
- No clipping or edge collision is introduced.

## Technical details
- File to update: `src/components/dashboard/website-editor/SectionNavItem.tsx`
- Current bug source: the hover action wrapper expands from zero width inside a flex row, which forces the content column to shrink.
- Implementation direction:
  - Keep a stable right-side action container width.
  - Reveal icons with `opacity`/`transform`, not width changes.
  - If needed, make the row `relative` and position the actions independently from the text block.
  - Preserve current spacing and sidebar width improvements already made.

## Validation
I’ll verify:
- built-in row hover behavior
- custom row hover behavior
- no layout jump in title/subtitle
- no toggle movement on hover