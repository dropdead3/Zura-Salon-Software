

# Enhancement Plan: 5 Sequential Improvements

## 1. Dynamic Supply Library (DB-backed)

**Problem**: The Professional Supply Library is a hardcoded 2,300-line TypeScript file. Platform admins cannot add/edit/remove products without a code deploy.

**Solution**:
- **New table**: `supply_library_products` with columns: `id`, `brand`, `name`, `category` (enum: color, lightener, developer, toner, bond_builder, treatment, additive), `default_depletion`, `default_unit`, `size_options` (text[]), `is_active`, `created_at`, `updated_at`. RLS: platform admins only.
- **Seed migration**: Insert all ~2,000 items from the hardcoded library into the new table.
- **New hook**: `useSupplyLibrary()` — replaces the static import. Fetches from the DB with brand-level caching.
- **Platform Admin tab**: Add a **"Supply Library"** tab (4th tab) to the existing `BackroomAdmin.tsx` page. CRUD table with search, brand filter, inline editing, and "Add Product" dialog.
- **Refactor consumers**: Update `BackroomProductCatalogSection.tsx` and `SupplyLibraryDialog.tsx` to use the new hook instead of importing from `professional-supply-library.ts`. Keep the static file as a fallback/reference.

**Files impacted**: New migration, new `useSupplyLibrary.ts` hook, new `SupplyLibraryTab.tsx` component, edits to `BackroomAdmin.tsx`, `BackroomProductCatalogSection.tsx`, `SupplyLibraryDialog.tsx`.

---

## 2. Connect Stripe to Backroom Paywall

**Problem**: The `BackroomPaywall` component shows a "Contact Sales" CTA but has no Stripe checkout flow.

**Solution**:
- Enable Stripe via the Stripe tool (this will expose the Stripe product/price creation tools).
- **Edge function**: `create-backroom-checkout` — creates a Stripe Checkout Session for the Backroom add-on product. On success webhook, upserts `organization_feature_flags` with `backroom_enabled = true`.
- **Webhook handler**: `stripe-backroom-webhook` — listens for `checkout.session.completed` and `customer.subscription.deleted` events to toggle the feature flag.
- **UI update**: Replace the "Contact Sales" button in `BackroomPaywall.tsx` with a "Subscribe — $X/mo" button that invokes the checkout edge function and redirects to Stripe Checkout.
- **Cancellation**: Add a "Manage Subscription" link in Backroom settings for entitled orgs that opens the Stripe Customer Portal.

**Files impacted**: New edge functions, edit `BackroomPaywall.tsx`, edit `BackroomSettings.tsx` (add manage subscription link).

---

## 3. Scheduled Price Sync Cron Job

**Problem**: The `wholesale-price-sync` edge function requires manual "Sync Now" clicks.

**Solution**:
- Use the insert tool (not migration) to create a `cron.schedule` entry that calls the `wholesale-price-sync` edge function daily at 4:00 AM UTC.
- The cron job uses `pg_cron` + `pg_net` (both already enabled) to POST to the edge function URL with the anon key.
- Add a "Last Auto-Sync" timestamp display in the Price Sources tab header, pulled from the most recent `last_polled_at` across all sources.

**Files impacted**: SQL insert for cron job, minor edit to `PriceSourcesTab.tsx`.

---

## 4. Add Bulk Reorder from Inventory Table

**Problem**: The inventory table view shows products in "Replenish" and "Urgent Reorder" status but has no bulk action to create purchase orders for them.

**Solution**:
- **"Reorder All" button**: Add a button above the inventory table that appears when any products have `replenish` or `urgent_reorder` status. Shows count badge.
- **Confirmation dialog**: `BackroomBulkReorderDialog.tsx` — Lists all products to reorder with their computed `order_qty` (par - on_hand). User can adjust quantities, toggle individual items, and choose "Save as Draft" or "Send to Suppliers".
- **Mutation**: Uses the existing `useBatchCreatePurchaseOrders` hook from `useBatchReorder.ts`, mapping each inventory row to a `BatchPOItem` with the product's supplier info and order qty.
- **Post-reorder**: Invalidates inventory queries and shows success toast with PO count.

**Files impacted**: New `BackroomBulkReorderDialog.tsx`, edit `BackroomProductCatalogSection.tsx` (add button + dialog trigger in table view header).

---

## 5. Stripe Integration for Backroom Paywall (continued — Webhook + Portal)

This is combined with item 2 above into a single implementation pass. The Stripe enablement, checkout session creation, webhook handling, and portal link are all part of the same deliverable.

---

## Build Order

1. **Supply Library DB table + seed + hook + Platform Admin tab + refactor consumers**
2. **Enable Stripe → create checkout edge function → webhook → update paywall UI**
3. **Cron job for daily price sync + UI timestamp**
4. **Bulk reorder button + dialog in inventory table**

## Technical Notes

- The Supply Library seed migration will be large (~2,000 INSERT statements) generated from the existing TypeScript data.
- Stripe enablement requires the Stripe tool — will prompt for secret key if not already configured.
- The cron job SQL must use the insert tool (not migration) since it contains project-specific URLs and keys.
- Bulk reorder reuses the existing `useBatchCreatePurchaseOrders` hook — no new purchasing logic needed.

