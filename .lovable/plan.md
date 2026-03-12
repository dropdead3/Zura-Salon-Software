

## Add Import History with Rollback to Retail Products Page

### Current State
All the rollback infrastructure already exists:
- `rollback-import` edge function deletes products by `import_job_id` and marks the job as rolled back
- `useImportJobs` hook fetches import job history; `useRollbackImport` hook triggers rollback
- `ImportHistoryCard` component renders job details with a "Rollback" button and confirmation dialog
- The `products` table has an `import_job_id` column linking imported records to their jobs

This is currently only surfaced on the platform admin import page. The salon-level Retail Products settings page has no visibility into past imports.

### Plan

**Edit: `src/components/dashboard/settings/RetailProductsSettingsContent.tsx`**

1. Import `useImportJobs` and `ImportHistoryCard`
2. In the `ProductsTab` component, fetch import jobs filtered to `entity_type = 'products'` for the current organization
3. Add a collapsible "Import History" section below the Import button / above the products table that:
   - Shows recent product imports as `ImportHistoryCard` entries (with `showRollback={true}`)
   - Only renders when there are import jobs to display
   - Uses a small toggle (e.g. `History` icon button) to expand/collapse the list so it doesn't clutter the main view

This reuses all existing components — no new files, no database changes, no edge function changes. One file edited.

### Files
- `src/components/dashboard/settings/RetailProductsSettingsContent.tsx` (edit)

