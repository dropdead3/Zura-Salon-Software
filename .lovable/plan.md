## Plan

I like this direction — your prompt is strong because it names the exact perceived failure mode, not just “make it smoother.” A slightly stronger version for future prompts would be: “Use a two-phase transition: outgoing content fades to 0 in place, then incoming content fades in at its new alignment with no overlap-driven reflow.” That gives a clear motion rule and avoids ambiguity about whether slides should crossfade or sequence.

### What I’ll change

1. Convert the foreground transition from an overlapping crossfade into a short sequential handoff:
   - Outgoing slide fades out quickly while staying anchored at its current alignment.
   - Incoming slide waits until the old one is effectively gone, then fades in quickly at the new alignment.
   - This removes the moment where left/right aligned content appears to pass through a centered intermediate state.

2. Stabilize layout ownership so alignment does not flip on the outer wrapper mid-transition:
   - Keep a stable outer foreground container that does not change horizontal placement during slide swaps.
   - Move the left/center/right alignment classes onto the per-slide inner content wrapper so each slide keeps its own anchor during its lifecycle.

3. Preserve vertical stability during the sequential fade:
   - Measure the foreground content box and keep a stable minimum height during transitions so the hero doesn’t collapse between exit and enter.
   - Reuse the project’s ResizeObserver-based container sizing pattern instead of introducing viewport-based logic.

4. Tune motion timing for the effect you described:
   - Use a fast fade-out and fast fade-in with a very small gap/overlap balance so the change feels intentional rather than laggy.
   - Keep it opacity-only by default so there is no lateral or vertical travel fighting the alignment change.

5. Add regression coverage for the new alignment contract:
   - Extend the hero alignment helper so it can represent a stable outer wrapper plus an inner per-slide alignment wrapper.
   - Add/update tests to lock the contract so future refactors don’t reintroduce wrapper-level alignment flipping.

### Files to update

- `src/components/home/HeroSlideRotator.tsx`
  - Change foreground animation sequencing.
  - Introduce stable outer shell + per-slide alignment wrapper.
  - Hold container height stable during exit/enter.

- `src/lib/heroAlignment.ts`
  - Split current alignment responsibilities so width clamp / stable shell are separate from per-slide alignment classes.

- `src/lib/heroAlignment.test.ts`
  - Add assertions for the new alignment shape and fallback behavior.

- `src/components/home/HeroSlideRotator.test.tsx`
  - Add a regression-oriented test around mode/alignment rendering contracts if needed.

### Technical details

Proposed structure:

```text
foreground shell (stable width / relative positioning / min-height)
└── AnimatePresence
    └── motion slide (absolute only while exiting, otherwise normal content layer)
        └── inner alignment wrapper (left / center / right per slide)
```

Proposed behavior:

- Replace the current overlapping `popLayout` crossfade with a sequential presence strategy so the outgoing content reaches opacity 0 before the new alignment becomes visible.
- Keep the shell centered and width-stable.
- Apply `text-left/text-center/text-right`, `ml-auto/mx-auto/mr-auto`, and CTA alignment classes inside the slide-specific wrapper.
- Use measured min-height on the shell so the opacity handoff doesn’t cause a layout dip.

### Why this should solve the issue

Right now the visible jump is coming from alignment state changing at a container level while both slides are participating in the transition. Your suggestion avoids that entire class of artifact: instead of trying to visually blend left-aligned content into right-aligned content, we let the first disappear cleanly and then bring in the next one already settled in its final position.

### Enhancement suggestions

After this lands, the next refinements I’d suggest are:

1. Per-mode timing:
   - `multi_slide`: slightly quicker handoff.
   - `background_only`: a softer, slower dissolve.

2. Motion policy by alignment delta:
   - Same-alignment slide changes can still crossfade.
   - Left↔center↔right changes use the new sequential fade.

3. Reduced-motion polish:
   - For reduced-motion users, switch to an almost immediate content swap with minimal opacity animation.

Approve this plan and I’ll implement it.