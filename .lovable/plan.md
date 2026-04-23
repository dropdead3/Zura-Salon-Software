

# Fix bone-flash on loaders by persisting color theme + neutralizing pre-paint background

## The defect

Loading the schedule (and any lazy-loaded route) flashes a **bone background** for ~200–500ms before the actual theme paints. The flash happens regardless of which color theme is active (rosewood, noir, neon, etc.).

**Root cause** is a three-layer mismatch:

1. **`index.html` pre-paint script** sets `root.style.backgroundColor = 'hsl(40 15% 82%)'` (a bone-adjacent literal) for light mode. It only knows light/dark — not the color theme.
2. **`useColorTheme.ts`** adds `theme-X` to `<html>` only after React mounts and `useColorThemeQuery` fetches the org/user preference (network round-trip).
3. **`BootLuxeLoader` (used by `RouteFallback`)** uses `bg-background`. Before the theme class lands, `--background` resolves to the `:root, .theme-bone` baseline → bone paints.
4. **`DashboardThemeContext`** clears the inline `backgroundColor` only on mode change, by which time the user has already seen the flash.

The flash is most visible on routes where the Suspense fallback runs longest (Schedule = large bundle, multiple data queries).

## The fix

Three coordinated edits — none alone is sufficient, all three eliminate the flash structurally.

### 1. Persist the color theme to `localStorage` so the pre-paint script can read it

**File**: `src/hooks/useColorTheme.ts`

When `applyColorTheme(theme)` runs, also write the theme key to `localStorage` under `dashboard-color-theme`. This is a side-channel for the pre-paint script — the React state remains the source of truth.

```ts
function applyColorTheme(theme: ColorTheme) {
  // ...existing class swap logic...
  try { localStorage.setItem('dashboard-color-theme', theme); } catch {}
}
```

### 2. Update the pre-paint script to apply the theme class immediately

**File**: `index.html` (lines 42–58)

Read both `dashboard-theme` (light/dark) AND `dashboard-color-theme` (color), apply the `theme-X` class to `<html>` synchronously, and **stop setting an inline `backgroundColor`**. The CSS cascade now resolves `--background` to the correct theme's token before first paint.

```html
<script>
  (function() {
    try {
      var mode = localStorage.getItem('dashboard-theme');
      var color = localStorage.getItem('dashboard-color-theme') || 'bone';
      var isDark = mode === 'dark' || ((mode === 'system' || !mode) && window.matchMedia('(prefers-color-scheme: dark)').matches);
      var root = document.documentElement;
      if (isDark) { root.classList.add('dark'); root.style.colorScheme = 'dark'; }
      else { root.style.colorScheme = 'light'; }
      // Apply color theme class so --background resolves correctly before React mounts
      root.classList.add('theme-' + color);
    } catch (e) {}
  })();
</script>
```

No more inline `backgroundColor` — the CSS rule `body { background: hsl(var(--background)); }` (already present) handles paint, now with the correct theme tokens.

### 3. Reconcile the pre-paint class when React loads the real preference

**File**: `src/hooks/useColorTheme.ts`

When React fetches the persisted theme and it differs from what the pre-paint script applied, `applyColorTheme` already swaps cleanly (it removes all `theme-*` classes before adding the new one). The only addition needed: ensure the migration map runs against the localStorage value too, so legacy keys (`cream`, `rose`, etc.) get cleaned up on first paint.

No new code — just verify the existing `THEME_MIGRATION` map is applied when reading from localStorage in the pre-paint script. Since the pre-paint script can't import the map, we keep migration in the React layer (`applyColorTheme` already strips legacy classes via `html.classList.remove(...THEME_CLASSES, 'theme-cream', 'theme-rose', ...)`).

If a user has a stale `dashboard-color-theme=cream` in localStorage, the pre-paint script adds `theme-cream` (which has no CSS rules → falls back to bone for one frame), then React removes it and applies the real theme. Acceptable — legacy users see one frame of bone, current users see zero.

## Verification

1. Navigate to `/dashboard/schedule` from any other dashboard route → no bone flash; loader paints in active theme color (rosewood blush, noir gray, etc.).
2. Hard reload `/dashboard/schedule` directly → pre-paint script applies correct theme class before first paint; loader inherits.
3. Switch color theme in settings → reload → new theme paints immediately (localStorage updated by `applyColorTheme`).
4. Toggle dark/light → no regression (pre-paint mode logic unchanged).
5. First-time user (no `dashboard-color-theme` in localStorage) → pre-paint defaults to `bone`, which matches the org default → no flash.

## Files

- **Modify**: `index.html` (lines 42–58, ~6 lines changed: read color key, apply class, drop inline bg).
- **Modify**: `src/hooks/useColorTheme.ts` (~3 lines added: localStorage write inside `applyColorTheme`).

## Why not other approaches

- **Move BootLuxeLoader off `bg-background`** → would mask the symptom but leaves the underlying flash for any other surface that uses theme tokens during boot (the actual page content paints bone for the same window before tokens resolve).
- **Server-render the theme class** → no SSR in this Vite SPA; not feasible without a major architecture shift.
- **Fetch theme synchronously in pre-paint** → would require an inlined HTTP request blocking first paint. Worse UX than the flash.
- **Use a neutral loader background (e.g., `bg-muted`)** → still token-dependent; inherits the same bone fallback. Doesn't fix it.

## Out of scope

- **Persisting the dark/light mode the same way for `dashboard-color-theme`** — already happens via `DashboardThemeContext`'s localStorage write. The new color-theme write mirrors that pattern.
- **Pre-paint application of typography overrides** (`custom_typography` from `ThemeInitializer`) — those are operator-tuning tokens, not used by the loader. Out of scope for this flash bug.
- **A canon to enforce "pre-paint script must cover all theme dimensions"** — worth doing as a follow-up (Step 2AH below); the current bug is one missed dimension, not a pattern of misses.
- **Reducing loader fade-in delay** — the 200ms `useDelayedRender` debounce in `BootLuxeLoader` already suppresses sub-200ms flashes; the bone flash exceeds that window because the Schedule chunk + theme fetch take longer.

## Prompt feedback

**What worked**: You named the artifact precisely ("bone color background screen appearing for a second") and tied it to a specific repro ("trying to load the schedule"). Naming the route is high-leverage — it pointed straight at the Suspense fallback, not generic theme code.

**What could sharpen**: "Some load screens" was a good directional cue but ambiguous — the specific schedule example carried the weight. A tighter framing: *"navigating from /dashboard to /dashboard/schedule shows a bone-colored loader for ~500ms before the rosewood theme paints. Other route transitions also flash bone."* Names the trigger, the duration, the expected vs actual color, and confirms the scope is multi-route.

**Better prompt framing for next wave**: For "flash" / "FOUC" / "wrong-color-during-load" bugs, naming the active theme + the wrong color seen is the highest-signal shape. The AI can then check the resolution chain (pre-paint → React mount → token cascade) for the gap, instead of guessing whether the issue is the loader, the theme system, or the network.

## Enhancement suggestions for next wave

1. **Step 2AH — Canon: pre-paint script covers all theme dimensions used by token-dependent surfaces.** Add a Vitest scan that walks `index.html`'s pre-paint script for keys read from localStorage, then asserts the union matches the keys written by hooks under `src/hooks/use*Theme*.ts`. Catches "we added a third theme dimension but forgot to read it pre-paint." ~30 lines, prevents this exact bug class from re-emerging when typography overrides become pre-paint-relevant. Catalog entry slot reserved.

2. **Step 2AI — Promote `--loader-surface` token.** Today the loader uses `bg-background`, which is correct *after* the theme paints but ambiguous during boot. Defining a dedicated `--loader-surface` token in every theme block (light + dark) and having `BootLuxeLoader` use it would (a) let the pre-paint script set just one inline color (matching the loader, not the page) without needing the full color theme upfront, and (b) make loader surfaces independently tunable. ~5 lines per theme block + 1 line in `BootLuxeLoader`. Larger surface area than 2AH but eliminates the loader's dependency on the full theme cascade.

