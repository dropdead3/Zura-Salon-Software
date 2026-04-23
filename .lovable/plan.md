

# God Mode bar: respect dashboard light/dark mode

## Diagnosis

The God Mode bar currently uses a single hardcoded near-black gradient base (`hsl(0 0% 6%)`) in *both* dark and light modes. Per the uploaded screenshots:

- **Dark mode** (Drop Dead in Neon dark): hot-pink-on-near-black reads beautifully — it's chrome that announces "system override" against a dark dashboard.
- **Light mode** (Drop Dead in Neon light): the same near-black gradient bleeds into the white dashboard, the pink looks muddy, and the bar reads as visually heavy/dirty rather than as crisp executive chrome.

The bar respects the org's *primary color* (Neon = hot pink) but does not respect the org's *light/dark mode*. Each mode needs its own treatment.

## What changes

### Single file: `src/components/dashboard/GodModeBar.tsx`

Read `resolvedTheme` from `useDashboardTheme()` and branch the visual treatment:

**Dark mode (unchanged from today):**
```
base:        hsl(0 0% 6%)           ← near-black system layer
gradient:    base → primary/0.55 → base
border:      hsl(var(--primary) / 0.4)
shadow:      0 4px 20px -4px hsl(var(--primary) / 0.35)
text/icon:   hsl(var(--primary-foreground)) family
exit btn:    bg hsl(var(--primary)) — hot pink pill
```

**Light mode (new):**
```
base:        hsl(0 0% 100%)                     ← clean white system layer
gradient:    white → primary/0.18 → white       ← much subtler accent wash
border-bottom: hsl(var(--primary) / 0.35)        ← single 1px hairline (like screenshot)
shadow:      0 2px 12px -4px hsl(var(--primary) / 0.25)  ← softer, less heavy
icon/label:  hsl(0 0% 8%)                        ← near-black text on white (legible)
"Viewing as:" / org name / account ID: dark text variants
exit btn:    bg hsl(var(--primary)) — pink pill stays vibrant on light, primary-foreground text
account details hover: bg hsl(var(--primary) / 0.10)
```

The **invariant** preserved across both modes: the bar's *accent* is always the org's `--primary`, and it always reads as a distinct system layer (dark sandwich on dark; soft accent wash + hairline on light). The "GOD MODE" label, Z icon, structural prominence, and Exit pill are identical — only the *base* and *text contrast* flip.

**Mechanism:**
- Add `import { useDashboardTheme } from '@/contexts/DashboardThemeContext';`
- `const { resolvedTheme } = useDashboardTheme();`
- Compute `isDark = resolvedTheme === 'dark'`
- Branch the `barBackground`, border color, shadow, and the four text-color values via a small `chrome` object so each style prop reads cleanly.

No changes to: layout, height, animation, mobile breakpoint, click handlers, z-index, `--god-mode-offset`, the Exit button's pink fill (intentional — keeps the exit affordance visually consistent across modes).

## Acceptance

1. Drop Dead in **dark mode + Neon** → bar looks identical to today's dark screenshot (hot-pink-on-black sandwich, pink Exit pill).
2. Drop Dead in **light mode + Neon** → bar reads as clean white with a soft pink accent wash, dark text, hot-pink Exit pill, single hairline border (matches the visual density of the second screenshot's clean dashboard chrome).
3. Switching dashboard light/dark mode via the existing toggle while in God Mode → bar updates immediately (no refresh needed; reactive to `resolvedTheme`).
4. Same treatment applies to all 8 themes (Zura, Cream, Rose, Sage, Ocean, Ember, Noir, Neon) — each gets a dark variant (existing) and a light variant (new), both keyed off their `--primary`.
5. Mobile/desktop layout unchanged. Animation unchanged. `--god-mode-offset` unchanged. Type-check passes.

## What stays untouched

- `--god-mode-offset` and all consumers (Sheet, Dialog, ZuraCommandSurface, PremiumFloatingPanel offsets).
- The Exit View pill stays `--primary` filled in both modes (intentional — primary affordance shouldn't fade in light mode).
- `PlatformContextBanner` (separate surface).
- The "GOD MODE" structural label — identity through structure stays constant; only color contrast flips.

## Doctrine alignment

- **Calm executive UX:** light mode's softer wash + hairline matches the airy density operators expect from light dashboards; the heavy dark sandwich would feel out of place.
- **Identity through color, role through structure** (extension of the previous wave): the org's primary color stays the identity anchor in both modes; the base flips to match the dashboard's mode so the bar reads as native chrome rather than a foreign overlay.
- **Persona scaling:** light-mode operators (Cream-leaning, day-shift command center users) get chrome that respects their environment; dark-mode operators (Neon, Noir, late-shift) keep the bold sandwich.

## Out of scope

- A third "auto-contrast" mode that darkens the bar when the dashboard scrolls past a high-contrast section. Defer — adds visual instability for marginal gain.
- Animating the dark↔light transition. Defer — the dashboard mode toggle is already an instant flip; matching that beats a fade.
- A separate light variant for the Exit pill. Defer — the pink stays loud on white intentionally so the exit affordance never gets lost.

## Prompt feedback

Strong, surgical follow-up — you caught the asymmetry from the previous wave (we themed the *color* but not the *mode*) and named both the symptom ("respect dark/light mode") and the requirement ("needs dark and light modes for each"). Two strengths:

1. **You named the missing dimension explicitly.** "Dark/light mode" is the orthogonal axis to color theme — naming both made it impossible to misread as "tweak the existing styling." The previous wave handled *hue*; this wave handles *value/contrast*. Naming the axis directly is what made it a one-sentence ask.
2. **You named the deliverable shape ("dark and light modes for each").** That phrase tells me the answer is two variants per theme, not a single "smarter" treatment that tries to work in both. Removed an architectural decision before I had to make it.

Sharpener: when extending a system you just built, naming the **asymmetry you noticed** in one phrase removes ambiguity about scope. Template:

```text
Extend: [recent change]
Missing axis: [the dimension that wasn't covered]
Variants needed: [N treatments × M conditions]
Shared invariant: [what stays constant across the new variants]
```

Here, "extend the God Mode bar theming — missing axis is dark/light mode, need 2 variants per theme, invariant is the org's primary color and the GOD MODE label" would have skipped my needing to derive the invariant.

## Further enhancement suggestion

For "extend a recently-shipped change" prompts, the highest-leverage frame is:

```text
Extend: [feature]
The gap: [what the previous wave didn't cover]
New axis: [the orthogonal dimension to add]
Cross-product: [how the new axis multiplies with what already exists — N × M]
Invariant: [what cannot change so the feature still reads as itself]
```

The **Cross-product** slot is the highest-leverage addition for this kind of follow-up — it forces the framing "this isn't one new thing, it's N existing things times M new conditions." Naming the multiplication upfront prevents under-scoping (handling only the most-visible variant, like Neon, and missing the other 7) and over-scoping (building a generic mode-detection abstraction when N×M is small enough to handle directly).

