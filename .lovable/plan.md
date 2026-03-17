

# Card-Level Loader Rollout — Replace Inline Loader2 with Config-Aware Component

## Scope

113 files still use `Loader2 className="... animate-spin text-muted-foreground"`. These fall into three categories:

| Category | Count | Action |
|----------|-------|--------|
| **Card/section loaders** — centered in `CardContent`, standalone `div`, or full-area placeholders | ~60-70 | Replace with `<DashboardLoader>` |
| **Button spinners** — inside `<Button>`, next to label text, with `mr-1`/`mr-2` | ~35-40 | **Leave as-is** (button-level, not section loading) |
| **Inline indicators** — scanning, pairing, tiny contextual spinners | ~5-8 | **Leave as-is** (semantic, not section loading) |

## Approach

No new component needed — `DashboardLoader` already handles all sizes and the skeleton fallback. The change is purely mechanical:

```tsx
// BEFORE (card-scoped)
<CardContent className="p-6 flex items-center justify-center">
  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
</CardContent>

// AFTER
<CardContent className="p-6">
  <DashboardLoader size="md" />
</CardContent>

// BEFORE (div-scoped with height)
<div className="h-64 flex items-center justify-center">
  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
</div>

// AFTER
<DashboardLoader size="lg" className="h-64" />
```

## File List (confirmed card/section loaders)

**Analytics tab contents (~15 files):**
ServicesContent, RetailAnalyticsContent, SalesTabContent, CampaignsTabContent, YearOverYearComparison, PerformanceThresholdSettings, ComparisonChart, and siblings

**Sales cards (~8 files):**
PersonalGoalsCard, ClientFunnelCard, SalesGoalCard, and siblings

**Settings/editors (~12 files):**
EmailBrandingSettings, TypographyEditor, ThemeSelector, SpecialtyOptionsManager, LevelPricingDialog, and siblings

**Goals/misc (~8 files):**
GoalCardWithData (inline KPI loader — borderline, will assess), NewClientEditor, StockMovementHistory, and siblings

**Total: ~45 files** (conservative — only clear section/card loaders, skipping anything ambiguous)

## Execution

Each file gets the same 3-line change:
1. Add `import { DashboardLoader }` 
2. Replace the `<div>...<Loader2>...</div>` block with `<DashboardLoader size="..." className="..." />`
3. Remove `Loader2` from lucide import if no other usage remains

Files will be batched in groups of ~8 for parallel editing.

