## Hero Parallax Reveal

Make the section immediately after the hero slide up *over* the hero as the visitor scrolls — so whichever section the operator drags into the second slot inherits the effect automatically. Operator-toggleable from Site Design, subtle intensity.

### How the effect works

```text
Initial          ↓ scroll                  ↓ scroll more
┌──────────┐    ┌──────────┐               ┌──────────┐
│  HERO    │    │  HERO    │  ← sticky     │ (next §) │  ← top of page
│          │    │          │               │          │
│          │    ├══════════┤  ← next §     │          │
└──────────┘    │ next §   │     rises     │ section  │
│ next §   │    │          │     over      │ 3, 4 …   │
└──────────┘    └──────────┘               └──────────┘
```

Hero gets `position: sticky; top: 0; height: 100vh`. The next section is a normal-flow block that scrolls up *over* the hero. Once fully covered, sticky releases and the rest of the page scrolls normally. No JS scroll listeners — pure CSS, GPU-accelerated, smooth on every device.

The "next section" gets a thin top shadow + slightly rounded top corners so the reveal edge reads as a deliberate panel, matching the aesthetic in your screenshot.

### Operator control

New toggle under **Site Design → Effects** (creating the Effects subsection if it doesn't exist):
- **Hero parallax reveal** — *Off by default* (no surprise behavior change for existing sites). When on, the section directly below the hero rises over the hero on scroll.

Stored on `site_settings` under the design key, following the read-then-update doctrine.

### What gets affected vs. what doesn't

| Surface | Behavior |
|---|---|
| Public site | Effect active when toggle on; flat scroll when off |
| Editor preview, **view mode** (matches public) | Effect active when toggle on |
| Editor preview, **edit mode** (floating bento cards) | Effect **always disabled** — sticky breaks the rearrangeable card layout |
| Pages without a hero as section #1 | Effect **silently disabled** — no anchor section to be sticky |
| Reduced-motion preference (`prefers-reduced-motion`) | Effect **disabled** — accessibility |

The effect is **section-position-aware, not section-type-aware**: drag Stylists into slot 2, Stylists rises over the hero. Drag Gallery in, Gallery rises. The renderer attaches the parallax wrapper to *index 1*, regardless of type.

### Files touched

**New / edited public-render layer**
- `src/components/home/PageSectionRenderer.tsx` — wrap section #0 with a sticky-hero container and section #1 with a `relative z-10` "rising panel" wrapper, only when toggle on, only in non-edit-mode, only when first section is `hero`, only when reduced-motion is not requested.
- `src/components/home/HeroParallaxLayout.tsx` (new) — small pure layout primitive owning the sticky/rising classes. Lives under `src/components/home/` so the live site and editor view-mode share the same component (Preview-Live Parity canon).

**Site Design toggle**
- `src/components/dashboard/website-editor/SiteDesignPanel.tsx` (or its `Effects` subpanel — locate during build) — add the toggle, persist via existing `siteSettingsDraft` flow.
- `src/hooks/useSiteDesign.ts` (or equivalent reader) — surface `effects.heroParallax: boolean` (default `false`).

**Tests (canon coverage)**
- `HeroParallaxLayout.test.tsx` — renders sticky wrapper only when `enabled && firstIsHero && !reducedMotion`.
- `PageSectionRenderer.parallax.test.tsx` — reorder fixture: when slot 2 changes from Stylists to Gallery, the rising-panel wrapper still attaches to slot 2.
- `SiteDesignPanel.heroParallax.test.tsx` — toggle persists through the read-then-update path.

### Out of scope

- No JS scroll-driven transforms (rejected: heavier, less smooth, unnecessary at "subtle" intensity).
- No per-section opt-in (the effect belongs to the *seam*, not any single section).
- No "cinematic" depth/fade variant in this pass — easy to add later behind the same toggle as a `mode` enum if you want.
