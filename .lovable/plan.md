

# Rename "Recipe" → "Formula" Across UI Labels

## Scope
Rename all user-facing instances of "Recipe"/"Recipes" to "Formula"/"Formulas" in UI labels, tooltips, descriptions, toasts, and comments. Database table names (`service_recipe_baselines`) and internal code identifiers (hook names, file names) remain unchanged since they reference the DB schema.

## Files to Edit (10 files)

### 1. `src/pages/dashboard/admin/BackroomSettings.tsx`
- Sidebar label: "Recipe Baselines" → "Formula Baselines"
- Section ID `'recipes'` → `'formulas'` (internal nav key)
- Tooltip: "Expected product quantities per service"
- Setup stepper references

### 2. `src/components/dashboard/backroom-settings/RecipeBaselineSection.tsx`
- Infotainer title: "Recipe Baselines" → "Formula Baselines"
- Infotainer description: update "recipe" references
- CardTitle: "Recipe Baselines" → "Formula Baselines"
- Dialog component internal labels

### 3. `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`
- Toast action: "Next: Recipe Baselines →" → "Next: Formula Baselines →"
- Navigate target: `'recipes'` → `'formulas'`
- Button label at bottom of section

### 4. `src/components/dashboard/backroom-settings/FormulaAssistanceSection.tsx`
- Hierarchy label: "Recipe Baseline" → "Formula Baseline"
- Description: "recipe baseline" → "formula baseline"
- Default disclaimer text: "recipe baselines" → "formula baselines"
- Infotainer description text
- Tooltip description text

### 5. `src/components/dashboard/settings/inventory/RecipeBaselinesManager.tsx`
- CardTitle: "Recipe Baselines" → "Formula Baselines"
- Any description text referencing "recipe"

### 6. `src/lib/backroom/services/formula-resolver.ts`
- Source label: `'Salon Service Recipe'` → `'Salon Service Formula'`
- Comment: "Salon Service Recipe" → "Salon Service Formula"

### 7. `src/components/dashboard/backroom/InstantFormulaCard.tsx`
- Display label: `'Salon Recipe'` → `'Salon Formula'`

### 8. `src/hooks/backroom/useBackroomDashboard.ts`
- Setup step label: `'Recipes'` → `'Formulas'`

### 9. `src/components/dashboard/backroom/UsageVarianceSummary.tsx`
- Comment: "service recipe baselines" → "service formula baselines"

### 10. `src/hooks/backroom/useEstimatedProductCharge.ts`
- Comments: "recipe baselines" → "formula baselines"

## What stays unchanged
- Database table name `service_recipe_baselines` (requires migration, not requested)
- Hook file names (`useServiceRecipeBaselines.ts`) — internal code, not user-facing
- TypeScript type names (`ServiceRecipeBaseline`) — internal
- `.from('service_recipe_baselines')` queries — must match DB

