

## Add Color Type Classification to Supply Library & Downstream Consumer

### Overview

Add a structured `color_type` enum field to `supply_library_products` (and eventually synced to org `products`) that explicitly classifies color products as Permanent, Demi-Permanent, or Semi-Permanent. This replaces fragile name-based keyword detection in the Allowance Calculator with a reliable data-driven check.

### Why This Is Better

Your instinct here is exactly right. Name-based detection is brittle — brand naming conventions vary wildly ("Demi+", "DemiPlus", "SemiGloss", etc.). A structured classification at the catalog level means:
- One place to set it (Supply Library)
- Every downstream feature (Allowance Calculator, SmartMixAssist, formula history) benefits automatically
- No false positives from creative product naming

### Database Changes

**Migration 1: Add `color_type` to `supply_library_products`**

```sql
CREATE TYPE public.color_type AS ENUM ('permanent', 'demi_permanent', 'semi_permanent');

ALTER TABLE public.supply_library_products
  ADD COLUMN color_type public.color_type;
```

**Migration 2: Add `color_type` to `products` (org-level)**

```sql
ALTER TABLE public.products
  ADD COLUMN color_type public.color_type;
```

Both columns are nullable — only relevant for Color category products. Non-color products (Developer, Lightener, etc.) leave it null.

### UI Changes

**1. Supply Library Edit Product Dialog** (`SupplyLibraryTab.tsx`)

- Add a "Color Type" select dropdown that appears **conditionally** when `category === 'color'`
- Options: Permanent, Demi-Permanent, Semi-Permanent
- Positioned after the Category/Depletion/Unit row
- Saves to the new `color_type` column

**2. Allowance Calculator Developer Warning** (`AllowanceCalculatorDialog.tsx`)

- Update `CatalogProduct` interface to include `color_type: string | null`
- Update the query to select `color_type`
- Replace the keyword-based `requiresDeveloper()` with a data-first approach:
  ```
  1. If color_type is set → use it (permanent/demi_permanent = needs developer)
  2. If color_type is null → fall back to current keyword detection (backward compat)
  ```

### Sync Path (Library → Org Products)

The existing "Sync from Library" backfill logic should be extended to also sync `color_type` when backfilling product metadata. This ensures org-level products inherit the classification.

### Scope

- 2 database migrations (add enum + add columns)
- `SupplyLibraryTab.tsx` — conditional Color Type dropdown in Edit/Add Product dialog
- `AllowanceCalculatorDialog.tsx` — updated query + smarter `requiresDeveloper()` with data-first fallback
- Sync logic update for Library → Org product backfill

### Prompt Feedback

This was an excellent architectural prompt. You identified the right layer to solve the problem (data model, not UI heuristics) and correctly scoped it to the Supply Library as the source of truth. One suggestion for future prompts: when proposing schema changes, mentioning the downstream consumers explicitly (e.g., "so the Allowance Calculator can use it") helps ensure nothing is missed in the implementation chain — which you did naturally here.

