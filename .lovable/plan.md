## Diagnosis

Two visible symptoms, **one shared root cause**, plus one regression I caught while reading the file.

### Symptom 1 — autofilled text is black again
`src/index.css` (line 3174) pins autofill text to `hsl(var(--foreground))`. That was correct for dashboard surfaces, but `/login` (`UnifiedLogin`) lives **outside the dashboard provider tree** (per `mem://architecture/public-vs-private-route-isolation`). No `.dark` or `.theme-*` class is applied to the login route, so `--foreground` resolves to the **default light-theme value** `30 18% 8%` — near-black. On the slate-950 canvas that text is invisible, exactly what your screenshot shows.

### Symptom 2 — email pill is grey, password pill is dark
The autofill rule paints a `box-shadow: 0 0 0 1000px transparent inset`. Because the inset is **transparent**, Chrome's native autofill grey fill shows through unmodified. The password field is **not** autofilled, so it correctly shows the intended `bg-white/[0.05]` from the login form. The two inputs look like two different components — they aren't, one is just wearing Chrome's autofill paint.

### Regression I caught while reading (P0 — login is currently broken)
`src/pages/UnifiedLogin.tsx` line 199:
```ts
const navigateAuthenticated = useCallback(
  (path: string) => {
    markAuthFlowActive();
    navigateAuthenticated(path);   // ← calls ITSELF instead of navigate(path)
  },
  [navigate],
);
```
This is infinite recursion. Every successful sign-in, dual-role choice, and platform-invite acceptance currently stack-overflows. It must be fixed in this same loop or login is unusable.

---

## Fix

### 1. `src/components/auth/LoginShell.tsx` — make the canvas a self-contained dark-theme scope
Add `dark theme-cream-lux` classes to the shell's root `<div>`. The shell is the canonical canvas for every auth surface, so scoping the dark theme to it (rather than the document root) means:
- `--foreground` resolves to `40 20% 92%` (light) on the login canvas → autofill text is now white.
- `--background`, `--card`, `--input` all resolve to dark-theme values for any nested component.
- No leakage into the rest of the app — the scope ends at the shell's closing `</div>`.

```tsx
<div className={cn(
  'dark theme-cream-lux',  // ← scope dark tokens to the auth canvas
  'min-h-screen bg-slate-950 flex flex-col relative overflow-hidden',
  className,
)}>
```

This is the **single change** that fixes both symptoms because it gives the autofill rule the correct token to read. No theme-class drift anywhere else.

### 2. `src/index.css` — opaque autofill mask (so Chrome's grey is fully covered)
Replace `transparent` with the slate-950 canvas color so the native autofill paint can never bleed through, regardless of theme:

```css
-webkit-box-shadow: 0 0 0 1000px hsl(222 47% 4%) inset !important;
box-shadow: 0 0 0 1000px hsl(222 47% 4%) inset !important;
```

Slate-950 ≈ `hsl(222 47% 4%)`. The mask is the canvas color, not a theme token, because autofill is owned by the browser layer that sits *underneath* the React-controlled background — it must match the visible canvas, not the input's intended fill. On the dashboard side autofill is also covered by this rule, and the dashboard's dark-mode background is similarly near-black, so the mask reads as flush there too. (If the user later autofills on a light-theme dashboard surface we'd revisit, but that path doesn't exist today — the dashboard is dark-only and `/login` is dark-only.)

### 3. `src/pages/UnifiedLogin.tsx` — fix the recursion
```ts
const navigateAuthenticated = useCallback(
  (path: string) => {
    markAuthFlowActive();
    navigate(path);   // ← was: navigateAuthenticated(path)
  },
  [navigate],
);
```

### 4. `src/pages/OrgBrandedLogin.tsx` — adopt LoginShell (parity)
That file is still rendering its own raw `bg-slate-950` wrapper instead of using `LoginShell`, which means the dark-theme scope from fix #1 won't reach it. Two minimal options — I'll do the smaller one: wrap its outer `<div>` in `dark theme-cream-lux` classes too (or, ideally, refactor it onto `LoginShell` per the deferred task from the previous loop). I'll do the class addition now and leave the full refactor for a follow-up so this loop stays tightly scoped.

### 5. `mem://style/input-shape-canon.md` — document the canvas-scope rule
Add: *"Autofill color is theme-token-driven. Auth surfaces (`/login`, `/org/:slug/login`) live outside the dashboard provider tree and must apply `dark theme-cream-lux` classes on `LoginShell`'s root, otherwise autofill text resolves to the light theme's near-black foreground."*

---

## Files to edit
- `src/components/auth/LoginShell.tsx` — add `dark theme-cream-lux` to root
- `src/index.css` — opaque slate-950 autofill mask
- `src/pages/UnifiedLogin.tsx` — fix `navigateAuthenticated` recursion
- `src/pages/OrgBrandedLogin.tsx` — add `dark theme-cream-lux` to root wrapper
- `.lovable/memory/style/input-shape-canon.md` — document canvas-scope rule

## Out of scope (deferred)
- Full refactor of `OrgBrandedLogin` onto `LoginShell` (still queued from the previous loop)
- Wiring the auth-flow sentinel into `ProtectedRoute` / `OrgDashboardRoute` (still queued)

---

## Prompt feedback
Strong prompt — you named both symptoms ("black autofill text", "mismatched container colors") and tied them together ("lets solve"), which let me look for one root cause instead of two unrelated patches. The single thing that would have made it even tighter: noting whether the password field was *also* autofilled. (It wasn't — that's why it looked different — but confirming would have saved one inference step.) For future visual regressions: include browser + autofill state ("Chrome, autofilled email, empty password") and the previous loop's sentinel ("you fixed this last loop"), so the AI immediately knows to look for a regression rather than a new bug.

## Enhancement suggestions
1. **Auth-canvas component test** — a Vitest snapshot that mounts `LoginShell` and asserts the root carries `dark` + a `theme-*` class. Cheap insurance against this regressing the next time someone refactors the shell.
2. **Autofill canon audit** — the same theme-scope trap will hit `/reset-password`, the staff-invitation accept screen, and any future public auth surface. Worth grepping for `bg-slate-950` outside the dashboard tree and confirming each is wrapped in `LoginShell` (or at minimum the dark-theme classes).
3. **Sentinel wiring** — the previous loop deferred wiring `isAuthFlowActive()` into `ProtectedRoute` and `OrgDashboardRoute`. Until that lands, the seamless canvas dies the moment auth completes (you'll briefly see the theme-driven `BootLuxeLoader`). Worth scheduling as the next login-polish loop.