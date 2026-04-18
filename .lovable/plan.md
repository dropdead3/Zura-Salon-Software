

## Goal
Unify the loading experience across the app. Eliminate flashes between light/black/white, ensure every loader respects the active theme (light/dark), and downsize the ZuraLoader so it stops dominating mid-page loads.

## Investigation needed before plan finalizes

I need to confirm a few things before writing the patch list. Let me list what I already know vs. what I'll verify in implementation mode:

**Known from current context:**
- `ZuraLoader` (the "disco Z") has sizes `sm | md | lg | xl` and a `platformColors` flag (violet shimmer) for bootstrap
- `DashboardLoader` reads platform branding to pick a loader style + size, defaults to `lg`
- `main.tsx` `BootstrapFallback` uses `bg-background` — but before React mounts, the HTML root may flash whatever color `index.html` paints first
- `DashboardThemeProvider` only applies `dark` class when zone is `org-dashboard` — so platform routes, public routes, and the bootstrap window won't get the user's saved theme
- Three other loader styles exist (`SpinnerLoader`, `DotsLoader`, `BarLoader`) all using `text-foreground/X` — these already respect theme via CSS vars

**Need to verify in implementation mode:**
- `index.html` initial `<body>` background color (source of pre-React flash)
- Whether a theme-init script runs before React (to set `dark` class on `<html>` from localStorage)
- All `<Loader2>` usages and ad-hoc loading states across the app (likely 30+ call sites)
- `DashboardLoader` default size usage — is `lg` being passed everywhere or just the default?

## Root causes of the chaos

1. **Pre-React flash (white→black or black→white):** No inline theme-init script in `index.html`. Browser paints body background before React reads localStorage and applies `dark` class. Bootstrap fallback then renders with `bg-background`, which resolves differently depending on whether `dark` class is set yet.

2. **Theme scope is too narrow:** `DashboardThemeProvider` only applies `dark` to `<html>` when `zone === 'org-dashboard'`. Public routes, login, platform routes, and the bootstrap window all render in light mode regardless of user preference — so navigating between zones causes visible theme flips.

3. **Loader size inflation:** `DashboardLoader` defaults to `size="lg"` and is used as a full-page loader inside cards/sections too. The Z-grid at `lg` (3.5×3.5 cells × 7 cols + gaps) is ~32px wide — visually heavy for inline section loads.

4. **Inconsistent loader vocabulary:** Mix of raw `<Loader2>` (lucide spinner, theme-agnostic via `text-muted-foreground`), `DashboardLoader` (config-aware), and `ZuraLoader` directly. No clear rule on which to use where.

## Proposed fix (4 layers)

### Layer 1 — Kill the pre-React flash (highest impact, smallest code)

**`index.html`** — add inline blocking script in `<head>` (before any paint) that:
- Reads `dashboard-theme` from localStorage
- If `dark` (or `system` + `prefers-color-scheme: dark`), adds `dark` class to `<html>` immediately
- Sets `<html>` background-color via inline style to match the resolved theme's `--background` token (hardcode the two HSL values to avoid CSS-var dependency before stylesheet loads)

This eliminates the white→dark flash for returning dark-mode users and the dark→light flash for light-mode users. ~15 LOC, no React dependency.

### Layer 2 — Broaden theme application scope

**`src/contexts/DashboardThemeContext.tsx`** — remove the `zone === 'org-dashboard'` guard around the `dark` class application. The user's chosen theme should apply globally: bootstrap, login, platform, public org pages, and dashboard. Keep the platform-color isolation (`.platform-theme` class scoping for branding tokens) — that's separate from dark/light mode.

Edge case: marketing/public routes that have hardcoded designs may need an opt-out wrapper class (`force-light-theme`) on their root. Will audit during implementation; if any exist, add a one-liner override in `index.css`.

### Layer 3 — Right-size the ZuraLoader

**`src/components/ui/ZuraLoader.tsx`** — no API change, but recalibrate the size scale:
- `sm`: keep current (already small, good for inline)
- `md`: shrink slightly (currently 2.5px cells → 2px) — this becomes the new section/card default
- `lg`: keep current (page-level loads)
- `xl`: keep current (bootstrap only)

**`src/components/dashboard/DashboardLoader.tsx`** — change default `size` from `lg` to `md`. Page-level loaders that need larger explicitly pass `size="lg"`.

This reduces visual weight in ~80% of usage (section/card loads) while preserving the bootstrap presence.

### Layer 4 — Standardize loader usage

Two-rule convention, documented at the top of `DashboardLoader.tsx`:

1. **Section/page loads inside the dashboard:** use `<DashboardLoader />` (config-aware, respects branding choice).
2. **Inline/button/inline-text loads:** use `<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />` — small, theme-aware via `text-muted-foreground`, never replaces the Z grid for tiny spots.

**Bootstrap fallback (`main.tsx`):** keep `ZuraLoader size="xl" platformColors` — this is the brand moment, not a generic loader. But ensure the fallback container uses `bg-background` and inherits the dark class from Layer 1's inline script.

**Audit pass:** scan for direct `<ZuraLoader size="lg" />` usage outside of bootstrap and `DashboardLoader`. Replace with `<DashboardLoader />` so branding config takes effect.

## Out of scope
- Replacing all `<Loader2>` usages with `DashboardLoader` (too aggressive — small inline spinners are fine)
- Adding a new loader style
- Touching the platform-side branding picker UI
- Marketing site visual redesign (just confirming dark-mode opt-out works there)

## Files to modify

| File | Change |
|---|---|
| `index.html` | Add inline `<head>` script: read theme from localStorage, apply `dark` class + inline `<html>` background before paint |
| `src/contexts/DashboardThemeContext.tsx` | Remove `zone === 'org-dashboard'` guard; apply `dark` class globally based on resolved theme |
| `src/components/ui/ZuraLoader.tsx` | Recalibrate `md` size down; document size guidance in JSDoc |
| `src/components/dashboard/DashboardLoader.tsx` | Default `size` from `lg` → `md`; add usage convention comment |
| `src/index.css` | (If audit finds public/marketing pages with hardcoded light design) add `.force-light-theme { color-scheme: light; }` opt-out class |
| Up to ~5 call sites | Replace direct `<ZuraLoader size="lg" />` mid-page with `<DashboardLoader />` (final list determined during audit) |

## Ship order
1. Layer 1 first (inline theme-init in `index.html`) — eliminates the most visible flash with the least risk
2. Layer 2 + 3 + 4 together — they're a single coherent UX wave
3. Audit pass — find and patch any rogue direct ZuraLoader usages

## Verification signal
- Hard-refresh the app in dark mode → no white flash before React mounts
- Navigate from login → dashboard → platform admin → public org page → no theme flips
- Section loaders (e.g., Schedule, Analytics) show smaller, less dominant Z grid
- Inline loaders in buttons/cards remain small spinners (unchanged)

