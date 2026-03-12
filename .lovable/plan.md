

## Add Product Import Wizard to the Retail Products Page

### What
Add an "Import Products" button to the Products tab toolbar that opens the existing `DataImportWizard` component configured for product imports. This lets salons upload a CSV of their current inventory (with location assignment, field mapping, preview, and dry-run support) directly from their Retail Products settings page.

### Why this is straightforward
The full import infrastructure already exists:
- `DataImportWizard` component supports `products` entity type with field definitions (name, SKU, barcode, category, brand, retail_price, cost_price, quantity_on_hand, description, external_id)
- `import-data` edge function handles product inserts with location scoping, dry-run mode, and job tracking
- The wizard includes CSV upload, auto-mapping, preview, and import progress steps

### Changes

**Edit: `src/components/dashboard/settings/RetailProductsSettingsContent.tsx`**

1. **Import** `DataImportWizard` from `@/components/admin/DataImportWizard` and `useOrganizationContext` from `@/contexts/OrganizationContext` and the `Upload` icon from lucide-react.

2. **In `ProductsTab`** — add state for the import wizard dialog (`showImportWizard`) and get `effectiveOrganization` from context.

3. **Add an "Import" button** next to the existing "Add Product" button in the toolbar:
   ```tsx
   <Button variant="outline" size={tokens.button.card} onClick={() => setShowImportWizard(true)} className="gap-1.5">
     <Upload className="w-4 h-4" /> Import
   </Button>
   ```

4. **Render `DataImportWizard`** at the bottom of the `ProductsTab` component:
   ```tsx
   <DataImportWizard
     open={showImportWizard}
     onOpenChange={setShowImportWizard}
     sourceType="csv"
     dataType="products"
     organizationId={effectiveOrganization?.id}
   />
   ```

### No new files, no database changes, no edge function changes
This reuses the existing import pipeline end-to-end. One file edited.

