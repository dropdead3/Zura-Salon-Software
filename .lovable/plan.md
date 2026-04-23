

# Theme the God Mode bar to the active organization

## Diagnosis

The God Mode bar (`src/components/dashboard/GodModeBar.tsx`) is hardcoded to the platform's violet/purple palette (`from-violet-950 via-purple-900 to-violet-950`, `bg-violet-500`, `text-violet-300`, etc.). When an operator impersonates an org whose theme is Neon (hot pink), Cream, Ocean, etc., the bar still reads platform-violet — it visually disowns the org you're viewing as.

The fix: when `isImpersonating` is true, the bar should pick up the impersonated org's `--primary` token so the chrome reads as part of the org you're inside, not the platform you came from. Violet stays the fallback (and is also the right answer when the org's theme *is* Zura/violet).

## What changes

### Single file: `src/components/dashboard/GodModeBar.tsx`

Replace hardcoded violet/purple Tailwind utilities with theme-token-driven inline styles + semantic tokens. The bar will read from CSS variables already set by the active dashboard theme (`--primary`, `--primary-foreground`, `--border`).

**Before → After mapping:**

| Element | Today | After |
|---|---|---|
| Background | `bg-gradient-to-r from-violet-950 via-purple-900 to-violet-950` | Inline `linear-gradient` using `hsl(var(--primary) / 0.95)` → `hsl(var(--primary) / 0.85)` → `hsl(var(--primary) / 0.95)` over a near-black base, so even light themes stay legible |
| Border | `border-violet-500/40` | `border-[hsl(var(--primary)/0.4)]` |
| Shadow | `shadow-[...rgba(139,92,246,0.3)]` | `shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.3)]` (inline style — Tailwind can't tokenize arbitrary shadows) |
| "God Mode" label + Z icon | `text-violet-300` | `text-[hsl(var(--primary-foreground)/0.85)]` |
| Divider | `bg-violet-500/40` | `bg-[hsl(var(--primary)/0.4)]` |
| "Viewing as:" label | `text-violet-200/80` | `text-[hsl(var(--primary-foreground)/0.75)]` |
| Org name | `text-white` | `text-[hsl(var(--primary-foreground))]` |
| Account ID | `text-violet-400/70` | `text-[hsl(var(--primary-foreground)/0.6)]` |
| Account Details button | `text-violet-300 hover:text-white hover:bg-violet-500/20` | Theme-token equivalents via inline styles for hover (`onMouseEnter`/`onMouseLeave`) or a small CSS-var-driven utility |
| Exit View button | `bg-violet-500 hover:bg-violet-400 shadow-violet-500/30` | `bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.85)] shadow-[hsl(var(--primary)/0.3)]` |

**Why a near-black gradient base regardless of theme:** the bar must always read as an *override* layer (system chrome, not content). A pure `--primary` flood would look washed in light themes (Cream) and indistinguishable from page chrome in violet themes. The gradient sandwich keeps the bar visually distinct as a system layer while the *accent* color picks up the org theme.

**Mechanism:** `--primary` is already set by the active org's theme class (`.theme-neon`, `.theme-cream`, `.theme-ocean`, etc.) which is applied to `<html>` by the existing `useColorTheme` flow during impersonation. No new context, no new state — just consume what's already in the DOM.

## Acceptance

1. Impersonating a **Neon**-themed org → God Mode bar reads hot-pink-on-near-black with hot-pink Exit button and shadow.
2. Impersonating a **Cream**-themed org → bar reads cream/oat-accented on near-black; remains legible.
3. Impersonating a **Zura** (violet) org → bar looks identical to today (violet), so no visual regression for the default theme.
4. Same applies to **Rose, Sage, Ocean, Ember, Noir** — each picks up its own primary.
5. Mobile/desktop layout unchanged. Animation unchanged. Click handlers unchanged. Z-index unchanged.
6. The 44px / 40px height and `--god-mode-offset` CSS var are untouched — Sheet, Dialog, ZuraCommandSurface, PremiumFloatingPanel offsets all keep working.
7. Type-check passes. No new dependencies.

## What stays untouched

- `PlatformContextBanner` (a separate banner used elsewhere — different surface, not part of this ask).
- `--god-mode-offset` CSS var and all components that read it.
- Animation, layout, click behavior, mobile breakpoint logic.
- The "God Mode" label text — the bar still announces itself as God Mode; only the *color* respects the org.

## Doctrine alignment

- **Complete UX simulation** (god-mode-governance memory): when you're "viewing as" an org, every chrome element should reflect that org's identity. The bar is the one piece of system chrome that *also* needs to remind you you're impersonating — so we keep the "God Mode" label and the structural prominence, but let the color belong to the org. Identity through color, role through structure.
- **Calm executive UX:** consistent theming across the bar and the dashboard reduces visual context-switching cost when moving between orgs in rapid succession.

## Out of scope

- A toggle to force the platform-violet bar regardless of org theme. Defer until an operator says the themed bar makes it harder to spot they're in God Mode (current contrast on near-black base should keep "I am impersonating" obvious).
- Theming `PlatformContextBanner` (the in-flow banner). Different surface, different ergonomics — handle separately if the user asks.
- Animating the color transition when switching between impersonated orgs. Defer — switching orgs is already a navigation event, color shift is implicit.

## Prompt feedback

Tight, single-concept prompt — eight words that fully scope the change and name the desired behavior. Two strengths:

1. **You named the *behavior* ("respect the org theme color"), not a specific color.** That left the implementation open and let me reach for `--primary` (the right token) instead of hardcoding any single hue. Naming the behavior beats naming the value when the value should be dynamic.
2. **You scoped it to the right surface (the bar) without bleeding into adjacent ones.** No mention of the in-flow banner, header, or sidebar — the surgical scope kept the change a single-file edit.

Sharpener: when asking a piece of chrome to inherit from a system, naming the **fallback behavior** removes one decision. Template:

```text
Make: [surface] respect [system value]
Fallback when [system value] is unset: [behavior]
Identity preservation: [what about the surface must NOT change so it still reads as itself]
```

Here, "respect the org theme color, fall back to violet, but keep the dark base so it still reads as system chrome" would have skipped my proposing-then-defending the near-black gradient base.

## Further enhancement suggestion

For "make X respect Y" prompts (where Y is a dynamic system value), the highest-leverage frame is:

```text
Bind: [property of X] to [token / state / context value]
Where defined: [the source of truth — CSS var, context, prop]
Fallback: [what to render if the source is empty]
Invariant: [the part of X's identity that must survive the rebinding]
```

The **Invariant** slot is the most-leverage addition — it forces you to name what makes the surface still recognizable as *itself* after the rebinding. For chrome that announces a system mode (God Mode, dev mode, debug mode), the invariant is usually "must remain visually distinct from content" — naming it prevents the AI from over-themeing into invisibility.

