

# Add Contact Name Field & Rename "Supplier Name" Label

## Changes

### 1. Database Migration
Add `contact_name TEXT` column to `product_suppliers`.

### 2. `AddSupplierWizard.tsx`
- Add `contact_name` to `SupplierDetails` interface and `EMPTY_DETAILS`
- Rename label "Supplier Name" → "Supplier or Distributor"
- Add "Contact Name" input field right after supplier name
- Include `contact_name` in the Review step rows
- Pass `contact_name` through to the upsert on completion

### 3. `BackroomSetupWizard.tsx`
- Add `supplierContactName` state
- Rename label "Supplier Name" → "Supplier or Distributor"
- Add "Contact Name" input after supplier name
- Pass `contact_name` to the batch upsert mutation

### 4. `SupplierSettingsSection.tsx`
- Add `contact_name` to the `ContactForm` type and form fields
- Display in the supplier detail panel

### 5. `useSupplierSettings.ts`
- Add `contact_name` to `SupplierGroup` interface, select query, and `updateContact` mutation

