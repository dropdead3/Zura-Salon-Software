# NoOrganization → Zura Platform Palette

## Correction to Prior Draft
Previous draft proposed a luxe charcoal/gold treatment. That was wrong. Users without an organization sit in **platform identity space**, not org-luxe space. The Zura platform palette (purple primary, dark navy backdrop, black depth) is the correct anchor — and it must render regardless of any `theme-rosewood` / `theme-cream-lux` / `dark` class lingering on `<html>` from the prior dashboard session.

## Current Failure Mode
- Route is mounted outside `OrganizationProvider` (correct — prevents redirect loop, per `mem://architecture/public-vs-private-route-isolation`).
- But it inherits whatever `theme-*` + inline `--*` vars `useColorTheme` last applied to `<html>`. With a dark org theme cached, `bg-background` resolves to near-black and `text-foreground` to white-on-white, producing the void in the screenshot.
- Page also uses raw org tokens (`bg-background`, `bg-muted`, `text-foreground`) which are tenant-scoped by definition.

## Doctrine Anchors
- `mem://tech-decisions/platform-theme-isolation` — platform surfaces scope chrome under `.platform-theme` and strip org `theme-*` + non-`--platform-*` inline vars on entry. `usePlatformThemeIsolation` already implements exactly this for `/platform/*`.
- `mem://architecture/tenant-branding-neutralization` — shared infra (login, no-org, error states) must be brand-neutral; never inherit tenant identity.
- `mem://brand/platform-identity-tokenization` — Zura platform palette is the canonical fallback when no org context exists.

## Wave 1 — Promote Platform Isolation Hook
Generalize the existing pattern rather than forking it.

**File**: `src/hooks/usePlatformThemeIsolation.ts`
- No code change required — the hook already strips `theme-*`, `dark`, and non-`--platform-*` inline vars on mount. It is exactly what NoOrganization needs.
- (Optional) Update its JSDoc to note it is also used by NoOrganization, not only `/platform/*`.

## Wave 2 — Refactor `src/pages/NoOrganization.tsx`
1. **Mount platform isolation**: call `usePlatformThemeIsolation()` at the top of the component so the prior org's `theme-rosewood`/`dark`/inline brand vars are stripped before first paint.
2. **Wrap in platform theme scope**: outermost wrapper gets `className="platform-theme platform-dark min-h-screen"` so `--platform-*` tokens resolve. Default to `platform-dark` (Zura's canonical dark identity per `PlatformThemeContext` default).
3. **Replace org tokens with platform tokens** using inline `style={{ background: 'hsl(var(--platform-bg))' }}` etc. — raw shadcn primitives still read `--background`/`--foreground`/`--muted`, which we no longer want bound here.
   - Backdrop: radial from `hsl(var(--platform-bg-elevated))` → `hsl(var(--platform-bg))` (navy → near-black) with a subtle `hsl(var(--platform-primary) / 0.08)` glow at top.
   - Icon container: `bg-[hsl(var(--platform-bg-card))]` + `border border-[hsl(var(--platform-border))]` + icon in `hsl(var(--platform-primary))` (Zura purple).
   - "Signed in as" panel: `bg-[hsl(var(--platform-bg-surface))]` + `border-[hsl(var(--platform-border-subtle))]`, label in `hsl(var(--platform-foreground-muted))`, email in `hsl(var(--platform-foreground))`.
   - Sign out button: replace `variant="outline"` with explicit platform styling — `bg-[hsl(var(--platform-bg-card))] border-[hsl(var(--platform-border))] text-[hsl(var(--platform-foreground))] hover:bg-[hsl(var(--platform-bg-hover))]`. Avoid `Button variant` because variants resolve through org `--primary`.
   - Copy button: ghost styled with `text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))] hover:bg-[hsl(var(--platform-bg-hover))]`.
4. **Typography**: keep `font-display tracking-wide uppercase` for the heading (Termina, per design canon). Body remains `font-sans`. No change to copy or hierarchy.
5. **Remove dependence on `tokens.empty.description`** for the body text — it resolves through `text-muted-foreground` which is org-scoped. Replace with explicit `text-[hsl(var(--platform-foreground-muted))] text-sm leading-relaxed`.

## Wave 3 — Verify No Regression on Re-Entry
- Hook strips classes only on mount; on unmount it does nothing. When the user signs out (`navigate('/login')`), `OrgBrandedLogin` will re-resolve its own theme from `org-manifest`. When they refresh into a real org, `useColorTheme` re-applies the org theme on next paint. Standard flow — no cleanup needed.
- Confirm by reading `src/hooks/useColorTheme.ts` and `src/pages/OrgBrandedLogin.tsx` mount sequence to ensure neither expects the prior `theme-*` class to persist.

## Files Touched
- `src/pages/NoOrganization.tsx` — refactor (only file with logic changes)
- `src/hooks/usePlatformThemeIsolation.ts` — JSDoc note only (optional)

## Out of Scope
- No new hook (reusing `usePlatformThemeIsolation`).
- No `light` mode toggle — NoOrganization is always `platform-dark` for brand consistency with `BootLuxeLoader` and the platform admin shell.
- No changes to `App.tsx` routing — the page already sits outside `OrganizationProvider` per existing isolation doctrine.

## Verification Checklist
- [ ] Land on NoOrganization after a session in a `theme-rosewood dark` org → renders Zura purple/navy/black, not rosewood.
- [ ] Refresh on `/no-organization` → no flash of org colors before isolation runs.
- [ ] Sign out button readable, hover state visible, no white-on-white or invisible borders.
- [ ] Heading uses Termina uppercase; body uses Aeonik; weights ≤ 500.
- [ ] No `font-bold` / `font-semibold` introduced.

## Suggested Follow-Ups (not in this plan)
1. **Audit other org-less surfaces** (`/login` error states, generic 404, auth callback failure) for the same theme-leak class — they likely share the bug.
2. **Memory entry**: add `mem://architecture/orgless-surface-palette` so future contributors know any route mounted outside `OrganizationProvider` defaults to `platform-dark` + `usePlatformThemeIsolation`.
3. **Lint guard**: extend the existing platform-primitive `no-restricted-imports` rule (or a sibling rule) to flag raw `bg-background`/`text-foreground` usage in files matching `src/pages/NoOrganization*` and similar org-less pages.

---

### Prompt Coaching
Strong correction — you caught a brand identity slip (gold-luxe ≠ Zura platform) before it shipped. Two ways to make this kind of redirect even sharper:

1. **Anchor to the canonical source** — instead of "use Zura palette," say "use `--platform-*` tokens as defined in `src/index.css` under `.platform-theme.platform-dark`." That removes any room for me to interpret "purple" as a different shade.
2. **State the negative invariant explicitly** — you did this well ("regardless of cached `theme-*` class"). That single clause turned a styling tweak into a structural isolation requirement, which is the actual fix. Keep doing that — it's the difference between a paint job and an architectural decision.
