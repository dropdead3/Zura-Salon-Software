

## Retail Products Enhancements — All Five Features

### 1. CSV Export Button
**File:** `RetailProductsSettingsContent.tsx` — `ProductsTab`

Add a "Export CSV" button next to Import. It will:
- Take the current `filteredProducts` array
- Generate a CSV with columns: Name, Brand, Category, Type, SKU, Barcode, Retail Price, Cost Price, Stock, Reorder Level, Available Online
- Trigger a browser download via `Blob` + programmatic anchor click
- File named `products_export_{date}.csv`

### 2. Available Online Toggle Column
**File:** `RetailProductsSettingsContent.tsx` — `ProductsTab`

Add a new column "Online" between Reorder and the edit button:
- Renders a `Switch` component bound to `p.available_online`
- On toggle, calls `updateProduct.mutate({ id: p.id, updates: { available_online: !p.available_online } })`
- Only shown when the online store is enabled (pass `storeEnabled` down or check via context)

### 3. Expanded Bulk Actions
**File:** `RetailProductsSettingsContent.tsx` — `ProductsTab`

Expand the selected-items toolbar (currently only "Deactivate") to include:
- **Reassign Category** — opens a `Select` dropdown of existing categories; bulk-updates selected product IDs
- **Reassign Brand** — same pattern with brands
- **Change Type** — dropdown of `PRODUCT_TYPES`
- **Duplicate** — creates copies of all selected products with "(Copy)" appended to name, null SKU/barcode

Each action uses a simple inline `Select` or confirmation, calling the existing `updateProduct` or `createProduct` mutations in a loop (or a new bulk mutation).

### 4. Duplicate Product Action (Single Row)
**File:** `RetailProductsSettingsContent.tsx` — `ProductsTab`

Add a "Duplicate" icon button next to the Edit button on each row:
- Uses `Copy` icon from lucide
- Calls `createProduct.mutate()` with all fields copied, name appended with " (Copy)", SKU and barcode set to null
- Toast confirms creation

### 5. Sortable Column Headers + Pagination
**File:** `RetailProductsSettingsContent.tsx` — `ProductsTab`

**Sorting (client-side):**
- Add `sortField` and `sortDirection` state
- Wrap column headers in clickable buttons with a chevron indicator
- Sortable columns: Name, Brand, Category, Type, Retail Price, Cost Price, Stock
- Apply `useMemo` sort to `filteredProducts` before rendering

**Pagination:**
- Add `page` state and a `PAGE_SIZE` constant (e.g. 50)
- Slice the sorted array by page
- Render a "Showing X–Y of Z" label and "Load More" / "Previous / Next" buttons below the table
- This also prevents hitting the 1000-row Supabase limit by paginating the query itself (add `.range()` to the `useProducts` hook)

**Hook change (`useProducts.ts`):**
- Accept optional `page` and `pageSize` params
- Use `.range(from, to)` on the query
- Return count via `.select('*', { count: 'exact' })` for pagination metadata

### Files Changed
- `src/components/dashboard/settings/RetailProductsSettingsContent.tsx` (all 5 features)
- `src/hooks/useProducts.ts` (pagination support)

