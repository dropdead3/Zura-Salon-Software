

## Retail Product Wizard

### Concept

Replace the current single-dialog product form with a multi-step wizard that guides salon owners through product setup. The wizard will include AI-powered description generation by scraping the manufacturer's website.

### Wizard Steps

```text
Step 1: Basics        → Name, Brand, Category, Type, Image
Step 2: Pricing & SKU → Retail price, Cost price, SKU, Barcode
Step 3: Description   → AI auto-generate from brand URL or manual entry
Step 4: Inventory     → Stock qty, Reorder level, Location
Step 5: Online Store  → Toggle available_online, review & confirm
```

### AI Description Generation (Step 3)

- User enters a product URL (e.g., from the brand's website) or just the product name + brand
- An edge function uses Lovable AI (Gemini Flash) to generate a concise, salon-friendly product description
- Two generation modes:
  - **From URL**: Edge function fetches the page content via a simple fetch, extracts text, then sends to Lovable AI with a prompt like "Write a 2-3 sentence retail product description for a salon, based on this manufacturer page content"
  - **From name + brand only**: Lovable AI generates a description using its training knowledge
- User can regenerate, edit the result, or skip entirely

### Changes

**New file: `src/components/dashboard/settings/ProductWizard.tsx`**
- Multi-step wizard component using internal step state (no router changes)
- Step indicator bar at the top showing progress
- Back/Next/Finish navigation
- Each step is a focused card with minimal fields
- Step 3 has a "Generate Description" button that calls the edge function
- Final step shows a summary card for review before saving
- Reuses existing `useCreateProduct` / `useUpdateProduct` hooks
- Reuses existing image upload pipeline (optimize + storage)

**New file: `supabase/functions/generate-product-description/index.ts`**
- Accepts `{ productName, brand, url?, category? }`
- If URL provided: fetches page as text, truncates to ~4000 chars
- Sends to Lovable AI Gateway with a salon-retail-focused system prompt
- Returns `{ description: string }`
- Handles 429/402 errors gracefully

**Edit: `src/components/dashboard/settings/RetailProductsSettingsContent.tsx`**
- Replace `showAddDialog` → opens `ProductWizard` instead of `ProductDialog`
- Keep `ProductDialog` for quick edits on existing products
- "Add Product" button launches the wizard; row edit icon keeps the existing dialog

**Edit: `supabase/config.toml`** — not directly edited, but the edge function will auto-register

### Wizard UX Enhancements

- **Smart defaults**: If brand is selected, auto-suggest the brand's typical category
- **Available online toggle**: Included in the final step so products can be immediately published
- **Summary review**: Last step shows all entered data in a clean read-only card before saving
- **Progress persistence**: Form state lives in React state across steps (no data loss on back/forward)

### Technical Notes

- No new dependencies needed
- Lovable AI (Gemini Flash) is used for description generation — no API key setup required
- The edge function does a lightweight server-side fetch of the brand URL (no Firecrawl needed for single-page text extraction)
- The wizard is a Dialog-based overlay, same as the current form, just wider and multi-step

