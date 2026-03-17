

# Loader Configurator for Platform Backend

## Analysis & Honest Assessment

**What works well:**
- `DashboardLoader` → `ZuraLoader` is now the single section-level loader across ~21 dashboard files
- `Skeleton` / `ChartSkeleton` are already used in ~155 files for card-level content shimmer
- Platform branding already persists to `site_settings` via `usePlatformBranding`

**Potential problems / trade-offs:**

1. **Skeleton loaders can't fully replace animated loaders everywhere.** Skeleton loaders work great for *cards with known layout* (e.g., a table with 5 columns, a stats row). But many current `DashboardLoader` usages are in *unknown-layout* contexts — settings panels, editors, configurators where the shape of the content varies wildly. Skeleton would need per-component skeleton templates. Realistic approach: offer a **global toggle** that swaps `DashboardLoader` to a simple `Skeleton` block (generic bars), but keep component-specific `Skeleton` patterns as-is.

2. **Loader style diversity is limited.** We currently have one loader (ZuraLoader "Z" grid). To make a configurator meaningful, we need at least 2-3 alternatives (e.g., classic spinner, pulsing dots, the Z grid). This is buildable but adds ~100 lines of new loader components.

3. **Performance is fine** — these are pure CSS animations, no runtime cost difference between variants.

---

## Plan

### 1. Create Alternative Loader Components
**New file: `src/components/ui/loaders/`**
- `SpinnerLoader.tsx` — classic circular spinner (Loader2-style but themed)
- `DotsLoader.tsx` — three pulsing dots
- `ZuraLoader.tsx` — move existing Z-grid here (re-export from old path for compat)
- `BarLoader.tsx` — horizontal pulsing bar

Each accepts `size` and `className` props matching the existing interface.

### 2. Add Loader Config to Platform Branding
**Extend `site_settings` → `platform_branding` value** (no schema change needed, it's JSONB):
```ts
// New fields in PlatformBranding interface
loader_style: 'zura' | 'spinner' | 'dots' | 'bar';  // default: 'zura'
use_skeleton_loaders: boolean;                         // default: false
```

Update `usePlatformBranding` hook to include these fields with defaults.

### 3. Build the Configurator UI
**New section in `PlatformAppearanceTab.tsx`** — a "Loading States" card with:
- **Loader Style Picker**: 4 visual cards showing each loader animating live, click to select
- **Skeleton Toggle**: Switch with description — "Use skeleton placeholders instead of animated loaders for section loading states"
- Live preview strip showing the selected loader at sm/md/lg sizes

### 4. Make `DashboardLoader` Config-Aware
**Modify `DashboardLoader.tsx`** to:
- Read loader config from a new `useLoaderConfig()` hook (reads from platform branding, cached)
- If `use_skeleton_loaders` is true → render generic `Skeleton` bars instead
- Otherwise → render the selected loader variant (`zura`, `spinner`, `dots`, `bar`)

This is the **single point of change** — all 21+ files using `<DashboardLoader>` automatically pick up the admin's choice.

### 5. Hook: `useLoaderConfig()`
Small hook that reads from the existing `usePlatformBranding` query (already cached 5min). Returns `{ loaderStyle, useSkeletons }`. No new DB queries.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/ui/loaders/SpinnerLoader.tsx` | Create |
| `src/components/ui/loaders/DotsLoader.tsx` | Create |
| `src/components/ui/loaders/BarLoader.tsx` | Create |
| `src/components/ui/loaders/index.ts` | Create (barrel export) |
| `src/hooks/useLoaderConfig.ts` | Create |
| `src/hooks/usePlatformBranding.ts` | Extend interface + defaults |
| `src/components/dashboard/DashboardLoader.tsx` | Make config-aware |
| `src/components/platform/settings/PlatformAppearanceTab.tsx` | Add "Loading States" card |

No database migrations needed — `site_settings.value` is JSONB and already stores arbitrary branding fields.

