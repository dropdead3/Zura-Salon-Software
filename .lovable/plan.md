

# Product Preview Section Enhancement

## Current Issues (from screenshot)
1. **Excessive dead space** — large gap between hero testimonial and the browser mockup with no content filling it
2. **No contextual heading** — the mockup appears without any label or description explaining what the user is looking at
3. **Small and isolated** — the 640px max-width mockup feels undersized on desktop; it floats in the middle without visual anchoring
4. **Weak visual hierarchy** — the section lacks a framing treatment that connects it to the hero above or the content below
5. **Glow behind card is too subtle** — barely perceptible, doesn't add meaningful depth

## Planned Improvements

### A. Add a section heading above the mockup
- A short contextual label like "See It In Action" with a supporting subtitle
- Uses the existing `SectionHeading` pattern for consistency

### B. Widen the mockup
- Increase `max-w-[640px]` to `max-w-[720px]` so the card has more visual presence on desktop

### C. Enrich the mock UI content
- Add a second dispensing row (e.g., developer/oxidant) to make the mock feel more realistic and fill the card better
- Add a subtle "timer" or session duration indicator in the header for authenticity

### D. Strengthen the background glow
- Increase glow opacity from `opacity-20` to `opacity-30` and expand the gradient for better depth contrast

### E. Reduce section bottom padding
- Tighten `pb-20 md:pb-24` to `pb-16 md:pb-20` so the gap to the next section feels more intentional

### F. Add a subtle top-edge fade
- A gradient overlay at the top of the section to create a smoother visual transition from the hero

## File Changed
- `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` — `ProductPreview` component (lines 87–151) and section wrapper (lines 572–574)

