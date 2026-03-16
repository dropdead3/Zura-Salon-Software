

# Animation Stability Audit — BackroomPaywall.tsx

## Animation Inventory & Verdicts

| # | Element | Mechanism | Duration | Travel | Verdict |
|---|---------|-----------|----------|--------|---------|
| 1 | Hero step content swap | `animate-fade-in` (CSS keyframe) | 600ms | 20px Y | **BROKEN** — auto-cycles every 3s with heavy movement; feels jarring |
| 2 | Feature panel swap | `animate-fade-in` (CSS keyframe) | 600ms | 20px Y | **TOO SLOW** — tab switch should be 150-200ms with minimal travel |
| 3 | Before/After cards | `hover-lift` class | 300ms | -4px Y + heavy shadow | **OVERDONE** — 300ms violates 120-160ms hover standard; shadow too aggressive |
| 4 | How It Works cards | `hover-lift` + `hover:shadow-md` | 300ms | -4px Y + heavy shadow | **OVERDONE** — same issue |
| 5 | RevealOnScroll | IntersectionObserver + CSS transition | 700ms | 24px Y | **BORDERLINE** — slightly long; reduce to 500ms and 16px |
| 6 | RevealOnScroll stagger delays | `delay={i * 100}` | 100ms increments | — | OK but compounds with 700ms base |
| 7 | Hero weight counter | requestAnimationFrame | 2000ms | — | **OK** — smooth, GPU-friendly |
| 8 | Hero dot indicators | `transition-all duration-300` | 300ms | width change | **OK** |
| 9 | Feature selector buttons | `transition-all duration-200` | 200ms | bg/border | **OK** |
| 10 | ActivateButton | `active:scale-[0.98]` + shadow | 200ms | — | **OK** |
| 11 | Product preview glow | Static CSS gradient | — | — | **OK** — no animation |
| 12 | Accordion (FAQ) | Radix built-in | 200ms | height | **OK** |
| 13 | Progress bars | `transition-all` on width | — | — | **OK** |
| 14 | `transition-all` on location rows | CSS | 150ms | — | **OK** |

## Critical Bugs

1. **Hero auto-cycle jank**: Every 3 seconds, the entire hero card content unmounts and remounts via React `key={heroStep}`, triggering a full 600ms fade-in animation with 20px vertical travel. This creates a constant bouncing motion that feels distracting, not premium. The content disappears abruptly (no exit animation) then slides up slowly.

2. **Feature panel swap lag**: Clicking a feature tab triggers the same 600ms/20px fade. For a direct-manipulation interaction, this feels sluggish. Should be 150-200ms with opacity-only or minimal travel (4-8px max).

3. **hover-lift violates motion standards**: The memory doc says hovers should be 120-160ms with opacity and shadow shifts only. `hover-lift` uses 300ms, translateY(-4px), and a heavy 12px/24px shadow — this is too much for a sales page card.

4. **No reduced motion support**: Zero `prefers-reduced-motion` handling anywhere on this page.

## Remediation Plan

### A. Fix hero step transition (line 418)
Replace `animate-fade-in` with a lighter class. Create a new `animate-fade-in-fast` that uses 250ms, opacity-only (no translateY). The hero content should crossfade, not bounce.

### B. Fix feature panel transition (line 835)
Same fix — use `animate-fade-in-fast` (250ms, opacity-only).

### C. Fix hover-lift on this page (lines 586, 614, 1019)
Replace `hover-lift` with a lighter pattern: `transition-shadow duration-150` + `hover:shadow-md`. No translateY. This matches the 120-160ms hover standard without layout shift.

### D. Tighten RevealOnScroll (lines 341-363)
- Duration: 700ms → 500ms
- Travel: `translate-y-6` (24px) → `translate-y-3` (12px)
- This keeps the reveal subtle and fast

### E. Add reduced motion support (lines 341-363)
Add `motion-reduce:` variants so RevealOnScroll and fade-in respect `prefers-reduced-motion`.

### F. Add `animate-fade-in-fast` to index.css
New class: 250ms, opacity-only, no translateY.

## Files Modified

1. **`src/index.css`** — Add `animate-fade-in-fast` keyframe + class, add `@media (prefers-reduced-motion)` block
2. **`src/components/dashboard/backroom-settings/BackroomPaywall.tsx`** — Fix hero fade, feature fade, hover-lift replacements, RevealOnScroll tuning

## Motion System Rules (Post-Fix)

| Context | Duration | Travel | Easing |
|---------|----------|--------|--------|
| Auto-cycling content | 250ms | 0 (opacity only) | ease-out |
| Tab/panel switch | 250ms | 0 (opacity only) | ease-out |
| Hover states | 150ms | 0 (shadow only) | ease-out |
| Scroll reveal | 500ms | 12px Y | ease-out |
| Button press | 200ms | scale(0.98) | ease-out |
| Accordion | 200ms | height | ease-out |

