

# Marine theme: deeper navy chrome + electric neon-blue accent

## Diagnosis

Per the screenshot, current Marine reads as:
- **Chrome swatch (left)**: near-black, no blue presence — should read as a *deep, rich navy* (you can tell it's blue without squinting)
- **Mid swatch**: muted slate-gray, washed out
- **Accent swatch (right)**: pleasant cornflower blue, but not *electric* — sits in the "friendly" register, not the "neon premium SaaS" register (Linear, Vercel, Arc)

Current `.theme-marine` tokens:
| Token | Value | Read |
|---|---|---|
| `--background` (dark) | (near-black, low blue saturation) | not visibly navy |
| `--card` (dark) | (muted slate) | grayish, no richness |
| `--primary` (light) | `220 90% 52%` | confident blue, but lightness too high — reads soft |
| `--primary` (dark) | `220 92% 62%` | cornflower, not neon |

Two axes need to move:
1. **Chrome (background/card/sidebar)** — push hue saturation up so dark surfaces read as *rich navy*, not gray-black
2. **Accent (primary/ring/chart-1)** — push toward *electric neon blue* (~`hsl(218 100% 60%)` family — Linear/Vercel/Arc territory)

## What changes

### Single concept

Two coordinated shifts: **chrome gets richer navy**, **accent gets electric**. The two layers move together — a navy chrome with a neon accent reads as "premium SaaS" the way denim chrome with a cornflower accent reads as "Office 365."

### Token shifts in `src/index.css`

**Light mode — `.theme-marine`:**

| Token | Before | After | Why |
|---|---|---|---|
| `--primary` | `220 90% 52%` | `218 100% 56%` | electric neon blue (Linear/Arc) |
| `--ring` | `220 90% 52%` | `218 100% 56%` | match primary |
| `--sidebar-primary` | `220 90% 52%` | `218 100% 56%` | match primary |
| `--background` | (current) | `218 35% 97%` | subtle navy tint on white |
| `--card` | (current) | `218 30% 99%` | barely-there navy wash |
| `--border` | (current) | `218 25% 88%` | navy-tinted border |
| `--accent` | (current) | `218 60% 92%` | soft navy hover state |
| `--chart-1` | `220 90% 52%` | `218 100% 56%` | match accent |
| `--chart-2` | `200 85% 50%` | `195 100% 50%` | electric cyan complement |
| `--chart-4` | (gold) | unchanged | gold differentiator stays |

**Dark mode — `.dark.theme-marine`:** (the bigger lift)

| Token | Before | After | Why |
|---|---|---|---|
| `--background` | (near-black, gray) | `220 50% 7%` | rich deep navy — visibly blue |
| `--card` | (muted slate) | `220 45% 11%` | navy-rich card surface |
| `--popover` | (current) | `220 45% 11%` | match card |
| `--secondary` | (current) | `220 40% 16%` | navy-rich secondary |
| `--muted` | (current) | `220 35% 14%` | navy-rich muted |
| `--accent` | (current) | `220 40% 18%` | navy hover state |
| `--border` | (current) | `220 35% 18%` | navy-tinted borders |
| `--sidebar-background` | (current) | `220 50% 6%` | deep navy sidebar |
| `--sidebar-border` | (current) | `220 40% 14%` | navy sidebar border |
| `--primary` | `220 92% 62%` | `218 100% 65%` | electric neon, reads punchy on deep navy |
| `--ring` | (current) | `218 100% 65%` | match primary |
| `--sidebar-primary` | (current) | `218 100% 65%` | match primary |
| `--chart-1` | (current) | `218 100% 65%` | match accent |
| `--chart-2` | (current) | `195 100% 60%` | electric cyan |
| `--chart-4` | (gold) | unchanged | gold differentiator stays |

The **deep navy chrome** is what makes the **electric accent** read as neon — without rich navy chrome, an electric accent just looks loud. The two layers are coupled.

### Swatch preview update in `src/hooks/useColorTheme.ts`

Update the `marine` entry's `lightPreview` and `darkPreview` to:
- `lightPreview.primary`: `hsl(218 100% 56%)`
- `lightPreview.bg`: `hsl(218 35% 97%)`
- `darkPreview.primary`: `hsl(218 100% 65%)`
- `darkPreview.bg`: `hsl(220 50% 7%)` (so the chrome swatch in the picker actually reads as navy, not black)
- `darkPreview.card`: `hsl(220 45% 11%)`

Description stays "Deep navy & gold."

### Terminal splash palette update in `src/lib/terminal-splash-palettes.ts`

Update `marine`:
- accent `#1e6bff` (electric)
- glow `#0d4fdb`
- RGB `(30, 107, 255)`
- gradient stops shift toward richer navy: `#050a1f` → `#0a1530` → `#050a1f`

## Acceptance

1. Marine swatch tile chrome reads as *visibly rich navy*, not near-black.
2. Marine swatch tile accent reads as *electric neon blue*, not friendly cornflower.
3. Selecting Marine in dark mode: sidebar, cards, page background all read as deep navy with clear blue presence.
4. Selecting Marine in light mode: sidebar active state, primary buttons, focus rings, chart-1 series all read as electric blue.
5. Gold chart-4 accent stays — executive differentiator preserved.
6. No other theme is affected.
7. Existing orgs on Marine automatically render the richer palette on next load.
8. Terminal splash for Marine reflects the deeper navy + electric accent.

## What stays untouched

- Marine's hue family (still ~218–220°, still "trusted blue").
- Marine's gold chart-4 accent.
- All other 7 themes.
- Theme picker chrome, swatch tile layout, count, order.
- Migration logic, God Mode bar, scroll-to-top, glass morphism.

## Out of scope

- Renaming Marine.
- Adding a second blue theme.
- Adjusting light-mode background to be heavily navy-tinted (light surfaces should stay mostly white — the navy lives in dark mode and on the accent).

## Doctrine alignment

- **Calm executive UX:** the electric accent reads as confident, not loud, *because* the navy chrome anchors it. A neon accent on a gray chrome looks like a notification dot; a neon accent on a deep navy chrome looks like Linear.
- **Brand abstraction:** "deep navy + electric blue" stays in the evocative-neutral register.

## Prompt feedback

Strong prompt — three things you did right:

1. **You named both layers ("richer dark blues, richer neon blues").** That's the chrome/accent split made explicit — exactly the framing I suggested last round. You internalized it and used it. Result: I don't have to guess which layer needed the lift; you told me both did.
2. **You used the word "neon"** — that's a much sharper anchor than "vibrant." Vibrant is a slider; neon is a destination (Linear, Arc, Vercel cluster). Cut the design space in half.
3. **You called out that the previous iteration wasn't there yet ("still not quite there").** Negative confirmation is as useful as positive — it tells me the previous direction was right but undershot, so I should push harder on the same axes rather than reverse course.

Sharpener: when iterating on a color shift, naming **how far to push** removes a calibration step. Template:

```text
Direction: [same as before / reverse]
Magnitude: [a little / a lot / all the way to the reference]
Reference: [the specific product to land on]
```

Here, "push it all the way to Linear's blue" or "go 50% more saturated than current" would have skipped my having to guess whether you wanted +20% or +60%. I picked "go all the way to neon" by inferring from "still not quite there" + "neon" — but you naming the magnitude would have anchored me directly.

## Further enhancement suggestion

For "iterate on a color/feel shift" prompts, the highest-leverage frame is:

```text
Previous iteration: [what changed last round]
Verdict: [right direction undershot / right direction overshot / wrong direction]
Push: [harder on same axis / same magnitude on different axis / reverse]
Anchor: [the destination product/feel]
```

The **Verdict** slot is the highest-leverage addition for color iteration — it tells me whether to **double down**, **dial back**, or **pivot**. Without it, "still not quite there" can mean any of three things, and I have to guess. For color specifically, the three failure modes are: (1) right hue, wrong saturation, (2) right saturation, wrong lightness, (3) right hue + saturation + lightness but wrong *layer* (you adjusted accent when chrome was the problem, or vice versa). Naming which of those three is happening cuts iteration count from 3 rounds to 1.

