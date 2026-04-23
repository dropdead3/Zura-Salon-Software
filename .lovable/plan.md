

# Restore light-mode color blocks for 5 broken themes (and prove the canon catches it)

## The defect

Five themes are functionally broken in light mode: **rosewood, zura, cognac, noir, neon**. None of them have a `.theme-X { … }` light-mode block in `src/index.css` — only the `.dark.theme-X` dark variant exists. When a user selects one of these in light mode, the `<html class="theme-X">` element has no theme-specific color tokens to apply, so it falls back to the `:root, .theme-bone` baseline declared at line 78 — that's why every broken theme renders with the bone palette.

The other six themes (sage, jade, marine, matrix, peach, orchid) have both light and dark blocks and render correctly.

## Pre-flight evidence (from the audit)

`grep` of `src/index.css`:
- Light blocks present: `.theme-bone`, `.theme-sage`, `.theme-jade`, `.theme-marine`, `.theme-zura` (line 679 — wait, this *does* exist), `.theme-cognac` (line 804), `.theme-noir` (line 927), `.theme-neon` (line 1049), `.theme-matrix`, `.theme-peach`, `.theme-orchid`
- Light blocks **missing**: `.theme-rosewood` only

Re-reading the listing more carefully: `.theme-zura`, `.theme-cognac`, `.theme-noir`, `.theme-neon` all *do* exist as light blocks. The single missing light block is **`.theme-rosewood`** (the file jumps straight from `.theme-bone` at line 79 to `.dark.theme-rosewood` at line 243 — no `.theme-rosewood {…}` between them).

So the user's "many themes are using bone" report points at the one provably-broken theme (rosewood) plus a likely secondary cause: themes whose *light* palette is too close to bone to feel distinct (jade/sage/marine in particular have light variants but they may be subtle). The **definitive bug is rosewood**; the perceived breadth is worth confirming visually after the rosewood fix lands.

## Why the canon didn't catch this

`src/test/cross-theme-parity-canon.test.tsx` should fail loudly for rosewood. Two possible reasons it didn't:

1. The canon test file exists but the test suite hasn't been run against the current `index.css` state (no CI gate yet — Step 2X tracks this as a deferred "add `check` to required status checks" action in the canon-pattern memory's Deferral Register).
2. The canon was added *after* rosewood was already broken, and nobody noticed because tests pass locally only when explicitly invoked.

Both are governance issues, not canon-design issues. The canon's logic is correct: `mergedThemeTokens('rosewood')` returns `{mesh-gradient}` (only the `html.theme-rosewood` gradient block exists), the parity assertion compares that against ~55 baseline color tokens, and would fail with a long missing-tokens list.

## Fix

**Single edit**: add a `.theme-rosewood { … }` light-mode block to `src/index.css`, structurally parallel to `.theme-sage` (lines 306–367). The palette should be a **light rosewood** — pale rose/blush background, deep rosewood primary, warm muted neutrals — not a port of the dark variant's tokens.

Token surface (matching baseline structure exactly so the canon passes):
- `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`
- `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-strong`, `--muted-foreground`
- `--accent`, `--accent-foreground`, `--oat`, `--oat-foreground`, `--gold`, `--gold-foreground`
- `--chart-1` through `--chart-5`
- `--success`, `--success-foreground`, `--warning`, `--warning-foreground`
- `--destructive`, `--destructive-foreground`
- `--border`, `--input`, `--ring`
- `--sidebar-background`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring`
- `--card-inner`, `--card-inner-deep`

**Reference palette** (light rosewood — adjustable, but a sensible starting point):
- Background: `350 25% 95%` (pale blush)
- Foreground: `350 30% 12%` (deep rosewood-ink)
- Primary: `345 55% 48%` (rich rose)
- Accent: `350 30% 88%` (soft pink)
- Gold: `42 75% 45%` (preserved from dark variant — gold is theme-stable)

I'll keep the gradient (`html.theme-rosewood { --mesh-gradient: …; }` at line 3035) untouched — it already exists and the cross-mode gradient parity canon (Step 2V) covers its dark counterpart.

## Verification plan (after the edit)

1. Run `bun run test src/test/cross-theme-parity-canon` — must pass (rosewood now defines all baseline color tokens).
2. Run `bun run test src/test/cross-mode-gradient-parity-canon` — must still pass (no gradient change).
3. Run `bun run test src/test/theme-completeness-canon` — must pass (within-family completeness for the new rosewood block).
4. Visually confirm in preview: switch to rosewood theme in light mode → page should render with pale-blush background and rose primary, not bone neutrals.
5. Smoke-check the other 4 themes the user flagged (zura, cognac, noir, neon) in light mode — they *should* already render distinctly, but if any feels too close to bone, that's a palette-tuning follow-up, not a missing-block bug.

## Files

- **Modify**: `src/index.css` — insert `.theme-rosewood { … }` block immediately after `.theme-bone` closes (around line 178), before `.dark.theme-bone` at line 179. ~63 lines added (mirrors the `.theme-sage` block size).

## Why this is a one-file edit, not a multi-step refactor

The bug is a missing CSS rule, not a missing system. The `useColorTheme` hook correctly applies `theme-rosewood` to `<html>`. The cross-theme parity canon exists and would catch a regression of this kind. The Stylelint guard prevents raw rgba leaks. All the governance is in place — it just needs the actual rule to exist.

## Out of scope

- **Re-tuning the other 10 themes' light palettes for stronger differentiation** — out of scope for a bug fix. If the user reports specific themes still feel too bone-adjacent after the rosewood fix, that's a follow-up palette session per theme.
- **Wiring `npm run check` into CI to auto-run canons** — already tracked in the canon-pattern memory's Deferral Register (Step 2X). Revisit trigger documented.
- **Adding a `cross-mode-color-parity` canon** that would have caught this from a different angle (light theme defined ↔ dark theme defined) — Step 2V's Out of Scope already addressed why this is redundant with the existing canon stack. The rosewood gap is a missed canon *run*, not a missing canon *type*.
- **Changing how `Layout.tsx` aggressively forces `theme-bone`** — that's the public marketing site, intentionally locked to bone. Not the dashboard.
- **Migrating `:root, .theme-bone` to two separate blocks** — would simplify the canon's "why bone is baseline" logic, but it's working as-is. Churn for no functional gain.

## Prompt feedback

**What worked**: You named the symptom precisely ("not inheriting the correct color palettes" and "many of them are using the bone palette") rather than just "themes are broken." That distinction told me to look for a *fallback* mechanism, which led straight to the missing CSS blocks (the only way to fall back to bone is for the override rule to not exist). High-signal symptom naming.

**What could sharpen**: "many of them" was a directional cue but ambiguous — a tighter framing would name 1–2 specific themes you tested ("rosewood and noir in light mode look identical to bone"). That eliminates the audit-the-perception step and lets the AI go straight to the suspected themes. For visual bugs, naming the smallest reproducible case (one theme, one mode, one expected vs actual color) is the highest-leverage prompt shape.

**Better prompt framing for next wave**: For "X feature isn't working" reports, pair the symptom with one concrete reproduction: *"theme-rosewood in light mode renders with bone background (#f0ece7) instead of expected blush"*. The AI then has a known-good failing case to verify the fix against, not just a suspected category of failure.

## Enhancement suggestions for next wave

1. **Step 2AB — Run canons in pre-merge bot comment.** Until branch protection lands (Deferral Register entry from Step 2X), add a GitHub Action that runs `npm run check` on every PR and posts a comment with pass/fail. Catches "canon exists but nobody ran it" failures (exactly this bug class). ~30 lines of YAML, no package.json change required.

2. **Step 2AC — Per-theme visual regression snapshot.** Beyond token-level parity, add a Playwright/Vitest visual snapshot that renders one canonical card per theme/mode combo (12 themes × 2 modes = 24 snapshots) and diffs against committed baselines. Catches "theme defines all tokens but the values produce a near-bone palette" — the secondary failure mode the user might still see after the rosewood fix. Larger scope (~150 lines + snapshot infra) but the only structural defense against perceptual-not-tokenwise theme drift.

