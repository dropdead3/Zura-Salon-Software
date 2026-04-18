

## Unify all loading states across the build

### The problem
Schedule load currently shows a stacked sequence of loaders:
- Purple spin wheel (likely raw `Loader2` with primary color)
- White spin wheel (raw `Loader2 text-muted-foreground`)
- Z + progress bar (LuxeLoader)
- Z disco grid (ZuraLoader)
- Possibly skeletons

This happens because every component along the load chain owns its own loader implementation. The user perceives 4–5 different "loading" treatments in <2 seconds — visually chaotic, brand-incoherent, and violates UI canon (calm, executive, one signal).

### Root cause
Three legitimate loader systems exist in parallel:
1. `DashboardLoader` (config-aware, reads branding) — the canonical one
2. `LuxeLoader` / `ZuraLoader` / `SpinnerLoader` / `DotsLoader` / `BarLoader` — primitives
3. Raw `Loader2` from lucide — sprinkled in dozens of files

The first two are governed. The third is the leak — and likely the dominant pattern in the schedule chain.

### Investigation needed (read-only)
1. Trace the schedule load chain:
   - `src/pages/Schedule.tsx` (or equivalent route)
   - Schedule layout / provider components
   - `OrganizationContext` loading state
   - Any data-fetching gates (auth, org, location, schedule data)
2. Grep for `Loader2` usage across the dashboard to quantify the cleanup surface.
3. Confirm `DashboardLoader` is the canonical entry point and identify which props (`fullPage`, `fillParent`, `caption`) should be used where.

### The fix (two waves)

**Wave 1 — Schedule load chain (immediate)**
Replace every loader in the schedule load path with a single `<DashboardLoader fullPage />` at the highest meaningful level (the route shell or schedule page root). All nested loaders during initial load become `null` (let the parent loader own the moment) — no double loaders.

**Wave 2 — Global cleanup (sweep)**
- Replace raw `Loader2` full-page/section uses with `DashboardLoader` (keep `Loader2` only for inline button spinners and tiny inline indicators — that's the documented exception).
- Audit any remaining direct `<LuxeLoader />`, `<ZuraLoader />`, `<SpinnerLoader />` usage outside `DashboardLoader` and route through the config-aware wrapper.
- Document the rule in `mem://style/loader-unification` so future components inherit it.

### Doctrine to commit
Single canonical loader rule:
- **Section / page / route loads** → `<DashboardLoader />` (with `fullPage` or `fillParent` as appropriate)
- **Inline button / tiny indicator** → `<Loader2 className="w-4 h-4 animate-spin" />` only
- **Nothing else.** No direct primitive loader imports outside `DashboardLoader.tsx` itself.

### Out of scope
- No changes to the loader primitives themselves (LuxeLoader, ZuraLoader, etc.) — they remain as the rendering substrate.
- No changes to skeleton mode toggle in branding settings.
- No changes to button-internal `Loader2` spinners.

### Pilot components
1. Schedule route shell (the immediate complaint)
2. `BookingSurfaceSettings` (currently raw `Loader2`)
3. `CategoryComparisonTable` (currently raw `Loader2`)

### Out of scope this wave
- Skeleton mode behavior
- Loader primitive internals
- Inline button spinners

### Done means
Loading the schedule shows exactly one loader treatment from initial nav to first paint — no flashing between purple spinner, white spinner, Z bar, and Z grid. The same single loader is the only loading visual anywhere in the dashboard outside button spinners.

### Verification
Hard-reload `/org/drop-dead-salons/dashboard/schedule` with throttled network. Confirm only one loader appears for the entire load duration. Repeat on Sales, Clients, and a deep route to confirm consistency.

