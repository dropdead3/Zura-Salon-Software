

## Enhance Product Wizard: Barcode Scanning, Batch Mode & Save as Draft

### 1. Barcode Scanning (Step 2: Pricing & SKU)

Add a camera-based barcode scanner button next to the Barcode input field using the browser's `BarcodeDetector` API (available in Chrome/Edge) with a `<video>` stream fallback.

**New file: `src/components/dashboard/settings/BarcodeScanner.tsx`**
- Opens a small modal with a live camera feed using `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`
- Uses `BarcodeDetector` API to detect UPC/EAN codes from the video stream
- On detection: returns the barcode string, stops the camera, closes the modal
- Fallback: if `BarcodeDetector` is not available, show a message suggesting manual entry
- Clean camera cleanup on unmount

**Edit: `ProductWizard.tsx` → `StepPricing`**
- Add a scan icon button (`ScanLine` from lucide) next to the Barcode input
- On scan result, populate the barcode field and optionally trigger a product lookup (using existing `useProductLookup`) to auto-fill name/brand/price if the barcode matches a known product

### 2. Batch Mode (Add Another)

After saving a product, instead of always closing the wizard, offer a "Save & Add Another" button.

**Edit: `ProductWizard.tsx`**
- Add a second button on the Review step: "Save & Add Another" alongside the existing "Create Product"
- On "Save & Add Another": save the product, reset form to `initialForm` but **preserve brand, category, location, and product_type** (common for batch entry of same-brand products), reset step to 0, show a success toast with the product name
- Track a `savedCount` state to show "X products added this session" in the header

### 3. Save as Draft

Allow partially completed products to be saved and revisited later. Requires a new database table.

**Database migration: `product_drafts` table**
```sql
CREATE TABLE public.product_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_data jsonb NOT NULL DEFAULT '{}',
  current_step integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.product_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own drafts" ON public.product_drafts
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

**New file: `src/hooks/useProductDrafts.ts`**
- `useProductDrafts()` — fetch all drafts for current user
- `useSaveProductDraft()` — upsert draft (form_data + current_step)
- `useDeleteProductDraft()` — remove draft after product is created or manually discarded

**Edit: `ProductWizard.tsx`**
- Accept optional `draftId` + `initialDraft` props to resume a draft
- Add "Save as Draft" button in the footer (ghost style, left side) on all steps except Review
- On save draft: persist form state + step number, close wizard, show toast
- On successful product creation: delete the draft if one was loaded

**Edit: `RetailProductsSettingsContent.tsx`**
- Show a small "Drafts (N)" badge/button near "Add Product" when drafts exist
- Clicking a draft opens the wizard pre-filled at the saved step

### Summary
- 1 new DB table (`product_drafts`) with RLS
- 2 new files: `BarcodeScanner.tsx`, `useProductDrafts.ts`
- 2 edited files: `ProductWizard.tsx`, `RetailProductsSettingsContent.tsx`

