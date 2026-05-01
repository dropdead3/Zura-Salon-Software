## Plan

Good catch — your prompt was clear and specific ("left/right not at the right areas, too much padding"), which is exactly the right level of detail. A slightly stronger version next time: "Left-aligned slide should hug the page's left padding edge, right-aligned should hug the right edge. Currently both look pulled inward toward center." That removes any ambiguity about whether you mean container edges vs viewport edges.

### What's wrong

In the previous fix I made the stable shell `max-w-4xl mx-auto` (a centered ~896px column). The inner per-slide wrapper then aligns left/right *within that narrow column*, not within the full hero region. That's why "NEW SLIDE" lands mid-screen on the right-aligned slide instead of hugging the right edge.

### Fix

Move the width clamp from the shell to the inner wrapper:

- `shellWrapper`: `w-full` (fills the hero region edge-to-edge inside the page padding)
- `innerWrapper`: keeps `max-w-4xl` + alignment anchor (`mr-auto` / `mx-auto` / `ml-auto`)

Now:
- Left slide → content column hugs the left padding edge.
- Right slide → content column hugs the right padding edge.
- Center slide → still centered (unchanged behavior).
- Stable shell still holds the foreground region against vertical/horizontal flicker during the sequential fade transition.

### Files to edit

- `src/lib/heroAlignment.ts` — swap `shellWrapper` and `innerWrapper` width-clamp ownership for all three alignments.
- `src/lib/heroAlignment.test.ts` — update the shell canon tests to assert `w-full` on the shell and `max-w-4xl` on the inner wrapper.

### Out of scope

- No change to `HeroSlideRotator.tsx` itself — it already consumes `shellWrapper` + `innerWrapper`, so this is a pure token-resolution fix.
- No change to the static `HeroSection` (it uses `wrapper`, which stays `max-w-4xl mr-auto/mx-auto/ml-auto`).
- No change to the transition mechanics — sequential fade stays as-is.

### Enhancement suggestions

1. **Edge breathing room control**: add an alignment-side padding token (`pl-2`/`pr-2` on left/right inner wrappers) so flush-left/flush-right content doesn't visually kiss the page padding edge on wide viewports.
2. **Per-slide content width override**: let operators choose the inner column width (`max-w-2xl` / `max-w-4xl` / `max-w-6xl`) so a punchy single-line slide can flex wider than a copy-heavy one.
3. **Alignment-aware safe zone for overlay UI**: the bottom-left pagination dots and bottom-right "SEE OFFER" pill currently sit in fixed corners — when content is right-aligned, the right edge can crowd the offer pill. Consider an alignment-aware nudge on the overlay anchors.

Approve and I'll ship the fix.