
# Add Secondary Contact for Supplier/Distributor

## Overview
Add three new columns (`secondary_contact_name`, `secondary_contact_email`, `secondary_contact_phone`) to `product_suppliers` and expose them in all supplier forms.

## Changes

### 1. Database Migration
Add three columns:
```sql
ALTER TABLE public.product_suppliers ADD COLUMN secondary_contact_name TEXT;
ALTER TABLE public.product_suppliers ADD COLUMN secondary_contact_email TEXT;
ALTER TABLE public.product_suppliers ADD COLUMN secondary_contact_phone TEXT;
```

### 2. `src/components/dashboard/backroom-settings/AddSupplierWizard.tsx`
- Add `secondary_contact_name`, `secondary_contact_email`, `secondary_contact_phone` to `SupplierDetails` and `EMPTY_DETAILS`
- Add a "Secondary Contact" section in `StepDetails` after the Website field — name, email, phone fields
- Include in the Review step
- Pass through to the upsert on creation

### 3. `src/components/dashboard/backroom-settings/SupplierSettingsSection.tsx`
- Add secondary contact fields to `ContactForm`
- Display in the supplier detail panel form

### 4. `src/hooks/backroom/useSupplierSettings.ts`
- Add secondary contact fields to `SupplierGroup`, select query, and `updateContact` mutation

### 5. `src/hooks/useProductSuppliers.ts`
- Add secondary contact fields to `ProductSupplier` interface and upsert mutations

### 6. `src/components/dashboard/backroom-settings/BackroomSetupWizard.tsx`
- Add secondary contact state and fields to the SuppliersStep
- Pass through to batch upsert

### 7. `src/components/dashboard/backroom-settings/inventory/SupplierAssignDialog.tsx`
- Add secondary contact fields to the form
