

# Fix Typography Rule Violations — Aeonik Pro with Tracking/Uppercase

## Problem

Multiple marketing components apply `uppercase` and wide `tracking-[0.15em]` / `tracking-wide` / `tracking-wider` to `font-sans` (Aeonik Pro) text. Per the design system, letter-spacing and uppercase are Termina (`font-display`) traits only. Aeonik Pro should never have these applied.

The screenshot shows the LogoBar section as one example, but this violation exists across ~10 marketing components.

## Fix

Every instance of `font-sans` combined with `uppercase` and/or explicit tracking must be corrected by switching to `font-display` (since the text is intended to be uppercase kicker/label style) or by removing the uppercase + tracking if it should remain Aeonik body text.

## Affected Files & Changes

| File | Line(s) | Current | Fix |
|------|---------|---------|-----|
| `LogoBar.tsx` | 12 | `font-sans ... uppercase tracking-[0.15em]` | → `font-display` |
| `LogoBar.tsx` | 28 | `font-display text-[11px] tracking-[0.12em]` (pill text) | Already correct — keep |
| `PersonaTargeting.tsx` | 39 | `font-sans ... uppercase tracking-[0.15em]` | → `font-display` |
| `FeatureGrid.tsx` | 46 | `font-sans ... uppercase tracking-[0.15em]` | → `font-display` |
| `IntelligencePillars.tsx` | 39 | `font-sans ... uppercase tracking-[0.15em]` | → `font-display` |
| `EcosystemPreview.tsx` | 46 | `font-sans ... uppercase tracking-[0.15em]` | → `font-display` |
| `EcosystemPreview.tsx` | 68 | `font-sans ... uppercase tracking-wide` | → `font-display` |
| `SolutionsMegaMenu.tsx` | 89, 114, 187, 203 | `font-sans ... uppercase tracking-[0.15em]` | → `font-display` |
| `SolutionsMegaMenu.tsx` | 269 | `font-sans ... tracking-wide` (no uppercase) | Remove `tracking-wide` |
| `ToolConsolidation.tsx` | 84, 94 | `font-sans ... uppercase tracking-wide` | → `font-display` |
| `HeroSection.tsx` | 90 | `font-sans ... tracking-widest uppercase` | → `font-display` |
| `DashboardMockup.tsx` | 209 | `font-sans ... tracking-wider uppercase` | → `font-display` |

## Rule Applied

- `font-sans` (Aeonik Pro): No uppercase, no explicit tracking — used for body text and UI labels in normal case
- `font-display` (Termina): Uppercase, wide tracking — used for kickers, labels, navigation, stats

**~12 files modified. 0 new. 0 deleted.**

