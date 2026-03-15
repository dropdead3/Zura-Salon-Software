

# Wholesale Price Intelligence + Backroom Platform Admin + Paywall

Three interconnected systems to build:

---

## 1. Wholesale Price Intelligence Pipeline

**Architecture**: Edge function runs on a schedule, calls distributor APIs (SalonCentric, CosmoProf, direct brand APIs where available) to fetch wholesale prices. Results go into a **staging table** for admin review before pushing to products.

### Database

**`wholesale_price_sources`** — Configures which APIs/sources to poll per brand:
- `id`, `brand`, `source_type` (api | manual_csv), `api_endpoint`, `api_key_secret_name`, `scrape_frequency` (daily | weekly), `is_active`, `last_polled_at`, `created_at`

**`wholesale_price_queue`** — Staging table for admin review:
- `id`, `product_id` (nullable, matched), `product_name`, `brand`, `sku`, `source_id` (FK to sources), `wholesale_price`, `recommended_retail`, `currency`, `fetched_at`, `status` (pending | approved | rejected | auto_applied), `reviewed_by`, `reviewed_at`, `confidence_score` (0-1, based on match quality), `previous_price`, `price_delta_pct`, `notes`, `created_at`

**RLS**: Platform admin only (via `is_platform_user`).

### Edge Function: `wholesale-price-sync`
- Called on schedule (cron) or manually by platform admin
- For each active source, calls the distributor API
- Fuzzy-matches results to existing products in the Supply Library by brand + SKU + name
- Inserts into `wholesale_price_queue` with a confidence score
- High-confidence matches (exact SKU match, delta < 5%) can be flagged for auto-apply
- Low-confidence or large price swings (> 15%) require manual review

### Review Flow
- Platform admin sees a queue of pending price updates
- Can approve (pushes `cost_per_gram` / `cost_price` to products table), reject, or edit before applying
- Batch approve/reject for trusted sources

---

## 2. Zura Backroom Platform Configurator

A new section in the Platform Admin area (`/dashboard/platform/backroom`) accessible only to platform admins.

### Platform Nav Addition
Add to `platformNav.ts` under a new **"Products"** group:
```
{ href: '/dashboard/platform/backroom', label: 'Backroom', icon: Package }
```

### Page: `/dashboard/platform/backroom`
Tabs:
1. **Price Queue** — Review/approve/reject pending wholesale price updates from the pipeline. Table with filters (brand, source, status, confidence). Batch actions.
2. **Price Sources** — CRUD for `wholesale_price_sources`. Configure API endpoints, polling frequency, toggle active/inactive.
3. **Entitlements** — List all orgs, toggle Backroom access on/off per org. Shows usage stats (tracked products, active sessions). Uses `organization_feature_flags` with flag key `backroom_enabled`.
4. **Supply Library** *(future, not v1)* — Manage the curated product library from the platform.

### Files
- `src/pages/dashboard/platform/BackroomAdmin.tsx` — page with tabs
- `src/components/platform/backroom/PriceQueueTab.tsx` — review queue
- `src/components/platform/backroom/PriceSourcesTab.tsx` — source config
- `src/components/platform/backroom/BackroomEntitlementsTab.tsx` — org toggle
- `src/hooks/platform/useWholesalePriceQueue.ts` — query + mutations for queue
- `src/hooks/platform/useWholesalePriceSources.ts` — query + mutations for sources

---

## 3. Backroom Paywall (Add-on to Zura Subscription)

### Gating Logic
- Use existing `organization_feature_flags` system with flag key `backroom_enabled`
- When an org navigates to `/dashboard/admin/backroom-settings`, check the flag
- If disabled: show a paywall card ("Unlock Zura Backroom — $X/mo add-on") with a CTA that triggers Stripe checkout for the Backroom add-on product
- If enabled: render the full Backroom catalog as today

### Implementation
- `src/hooks/backroom/useBackroomEntitlement.ts` — checks `organization_feature_flags` for `backroom_enabled`
- `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` — paywall UI with feature list, pricing, and Stripe checkout CTA
- Wrap `BackroomProductCatalogSection` and all backroom routes with the entitlement check
- Stripe product/price creation handled via the existing Stripe integration (will need to enable Stripe connector)

### Protective Layer (Automation Compliance)
Per the platform's "Recommend → Simulate → Request Approval → Execute" pattern:
- Price updates from the pipeline are **never auto-applied** to org products without platform admin approval
- High-confidence matches get a "Recommended" badge but still sit in the queue
- Platform admin can configure auto-apply thresholds per source (e.g. "auto-apply if confidence > 0.95 AND delta < 3%")

---

## Build Order

1. Database migration (2 new tables: `wholesale_price_sources`, `wholesale_price_queue`)
2. Edge function `wholesale-price-sync` (API integration skeleton + queue insertion)
3. Platform hooks (`useWholesalePriceQueue`, `useWholesalePriceSources`)
4. Platform Backroom Admin page + tabs
5. Backroom entitlement hook + paywall component
6. Wire paywall gate into existing backroom routes

## Technical Notes

- Distributor API integrations will start as configurable skeletons — actual API keys/endpoints will be added per-source as distributor partnerships are established
- The confidence scoring uses exact SKU match (1.0), brand+name fuzzy match (0.7-0.9), name-only match (0.3-0.6)
- All price queue operations are audited via `platform_audit_log`

