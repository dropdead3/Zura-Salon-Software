

## Configure Allowance & Product Allowance Calculator — Gap Analysis (Round 4)

Full review of the 1,606-line dialog, save logic, database constraints, hooks, and ServiceTrackingSection integration after three rounds of improvements.

---

### Bugs / Data Integrity

**1. Same product in multiple bowls is silently broken (P0)**
The `service_recipe_baselines` table has a `UNIQUE(organization_id, service_id, product_id)` constraint. The `useUpsertRecipeBaseline` hook uses `onConflict: 'organization_id,service_id,product_id'`. This means if a user adds the same product to Bowl 1 and Bowl 2, the second upsert overwrites the first row — only one baseline survives, assigned to the last bowl processed. The UI allows this (and even shows a "Also in Bowl 1" badge), but the database physically cannot store it.

**Fix:** Migration to drop the unique constraint and replace with `UNIQUE(organization_id, service_id, product_id, bowl_id)`. Update the upsert hook to use plain `.insert()` instead of `.upsert()` since `handleSave` already deletes all existing baselines first (delete-then-recreate pattern makes upsert unnecessary).

**2. `useUpsertRecipeBaseline` suppresses individual toast on every line save (P1)**
During `handleSave`, each baseline triggers `toast.success('Formula baseline saved')` via the mutation's `onSuccess`. With 8+ products across 2 bowls, this fires 16+ success toasts before the final "Product allowance saved" toast. The individual toasts should be suppressed during batch saves.

**Fix:** Add a `silent` option to the mutation, or call `mutateAsync` and handle success/error at the batch level only (the `onSuccess` in the hook should check a flag or the caller should use a raw supabase call instead of the mutation for batch operations).

**3. `useUpsertAllowanceBowl` also fires individual toasts (P1)**
Same issue — each bowl insert triggers the mutation's `onError` handler with toast. The `onSuccess` doesn't toast, but errors would show per-bowl error toasts stacking up.

---

### UX Gaps

**4. No indication of which products have zero cost-per-gram (P1)**
Products with `cost_per_gram = null` and no derivable cost (missing `cost_price` or `container_size`) silently add at $0.0000/g. The line shows "$0.00" cost but doesn't warn the user that the product has no pricing data. This leads to artificially low allowance calculations.

**Fix:** Show an inline warning badge on lines where `costPerGram === 0`, e.g., "No cost data" with a tooltip explaining the product needs cost-per-gram or cost-price + container-size in the catalog.

**5. Picker doesn't indicate already-added products across bowls (P2)**
The product picker checkbox only checks against the current bowl's `addedProductIds`. A product added to Bowl 1 shows as unchecked when browsing in Bowl 2's picker, with no visual hint it's already used elsewhere. The "Also in Bowl 1" badge only appears after adding.

**Fix:** Show a subtle indicator (e.g., small dot or "in Bowl 1" text) on picker items that exist in other bowls.

**6. Developer ratio input allows values outside safe range (P2)**
The ratio `<Input>` has `min="0.5"` and `max="4"` attributes, but HTML number inputs don't enforce min/max on typed values. A user can type `0` or `10`, which would calculate extreme quantities. The `updateDevRatio` callback doesn't clamp.

**Fix:** Clamp the ratio value in `updateDevRatio` to `[0.5, 4]` range.

**7. Custom quantity input allows 0 (P2)**
The quantity `<Input>` has `min="1"` but the `onChange` uses `Math.max(1, ...)`. However, if the user clears the field and blurs, `parseInt('') || 1` catches it — but while the field is empty, intermediate renders show `NaN` or `0`. Add an `onBlur` handler to force-commit valid values.

**8. Closing dialog after save still shows unsaved-changes warning (P1)**
Line 628: `onOpenChange(false)` is called after save, but the `onOpenChange` handler on line 910–918 checks `isDirty`. Although `initialBowlsRef` is updated at line 624, React's state batching means the `isDirty` memo may not have re-evaluated by the time the `onOpenChange` callback fires. This can cause a false "unsaved changes" warning flash.

**Fix:** Call `onOpenChange(false)` via `setTimeout(() => onOpenChange(false), 0)` or set a `justSaved` ref that bypasses the dirty check.

---

### Enhancements

**9. "Low" health status should offer actionable "reduce price" button (P2)**
When allowance is below 6%, the UI shows a static pill with the suggested allowance amount but no action button (unlike "high" which has "Use $X suggested price"). Add a "Use $X price" button for the low case that sets the service price to bring allowance to 8%.

**10. Footer layout breaks on narrow viewports (P2)**
The footer's flex layout (`justify-between`) doesn't wrap gracefully below ~700px. The health indicator, modeled price input, and save button overlap. Add responsive wrapping (`flex-wrap`) and stack on mobile.

**11. No visual progress during multi-step save (P3)**
The saving overlay shows "Saving allowance..." but doesn't indicate progress (e.g., "Deleting old data... Saving Bowl 1... Saving Bowl 2... Updating policy..."). For services with 3+ bowls this takes several seconds with no feedback.

**12. Copy summary doesn't include developer ratio context (P3)**
The copy summary includes developer gram amounts but doesn't explain the ratio logic for recipients unfamiliar with the format. Add a brief note like "(1:2 ratio with color)" next to developer lines.

---

### Summary

| Priority | # | Change | Scope |
|----------|---|--------|-------|
| P0 | 1 | Fix unique constraint + upsert for multi-bowl same product | Migration + useServiceRecipeBaselines.ts |
| P1 | 2 | Suppress per-line toasts during batch save | AllowanceCalculatorDialog.tsx |
| P1 | 3 | Suppress per-bowl error toast stacking | AllowanceCalculatorDialog.tsx |
| P1 | 4 | Warn on zero-cost products | AllowanceCalculatorDialog.tsx |
| P1 | 8 | Fix false dirty warning after save | AllowanceCalculatorDialog.tsx |
| P2 | 5 | Cross-bowl indicator in picker | AllowanceCalculatorDialog.tsx |
| P2 | 6 | Clamp developer ratio input | AllowanceCalculatorDialog.tsx |
| P2 | 7 | Validate quantity on blur | AllowanceCalculatorDialog.tsx |
| P2 | 9 | Add "reduce price" action for low health | AllowanceCalculatorDialog.tsx |
| P2 | 10 | Responsive footer wrapping | AllowanceCalculatorDialog.tsx |
| P3 | 11 | Save progress indicator | AllowanceCalculatorDialog.tsx |
| P3 | 12 | Developer ratio in copy summary | AllowanceCalculatorDialog.tsx |

### Technical Approach

- **Item 1** requires a database migration to alter the unique constraint on `service_recipe_baselines` from `(org, service, product)` to `(org, service, product, bowl_id)`. The `bowl_id` column must become `NOT NULL` for the constraint to work properly. The upsert hook switches to plain insert since the delete-then-recreate pattern makes conflict resolution unnecessary.
- **Items 2–3** are solved by using raw supabase calls in `handleSave` instead of the mutation hooks (which have built-in toast handlers), or by adding a `silent` parameter to the hooks.
- **Items 4–12** are UI-only changes within AllowanceCalculatorDialog.tsx.

