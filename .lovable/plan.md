

# Zura Backroom Settings Configurator — Implementation Plan

## Architecture Decision: Standalone Page, Not Settings Tab

The existing `/dashboard/admin/settings` page has 20+ categories already. Backroom Settings is a complex domain workspace with 13+ sections. Adding it as a tab would create a bloated, confusing experience.

**Decision:** Create a dedicated route `/dashboard/admin/backroom-settings` with its own sidebar navigation, similar in spirit to how the Operations Hub and Website Hub are standalone pages. Register it in the sidebar under the "Manage" section.

## Existing Infrastructure Reuse Map

| Domain | Existing Table/Hook | Reuse? |
|---|---|---|
| Products | `products` table, `useProducts`, `RetailProductsSettingsContent` | Extend with backroom-specific columns |
| Stations | `backroom_stations`, `useBackroomStations` | Full reuse |
| Recipe Baselines | `service_recipe_baselines`, `useServiceRecipeBaselines` | Full reuse |
| Allowance Policies | `service_allowance_policies`, `useServiceAllowancePolicies` | Full reuse, extend for buckets |
| Smart Mix Assist | `smart_mix_assist_settings`, `useSmartMixAssistSettings` | Full reuse |
| Inventory | `stock_movements`, `inventory_projections`, `product_suppliers` | Full reuse |
| Services | `services` table | Extend with backroom tracking columns |
| Permissions | `user_roles`, `dashboard_element_visibility` | Extend pattern |
| Staff Pinned Products | `staff_pinned_products`, `useStaffPinnedProducts` | Full reuse |

## Database Changes Required

### Phase 1 Migration: Extend existing tables + create new config tables

**1. Add backroom columns to `products`:**
```
is_backroom_tracked BOOLEAN DEFAULT false
depletion_method TEXT DEFAULT 'weighed'  -- weighed, per_pump, per_scoop, per_sheet, per_pair, per_service, manual
is_billable_to_client BOOLEAN DEFAULT false
is_overage_eligible BOOLEAN DEFAULT false
is_forecast_eligible BOOLEAN DEFAULT true
cost_per_gram NUMERIC(10,4)
unit_of_measure TEXT DEFAULT 'g'
subcategory TEXT
variant TEXT
size TEXT
```

**2. Add backroom columns to `services`:**
```
is_backroom_tracked BOOLEAN DEFAULT false
assistant_prep_allowed BOOLEAN DEFAULT false
smart_mix_assist_enabled BOOLEAN DEFAULT false
formula_memory_enabled BOOLEAN DEFAULT false
predictive_backroom_enabled BOOLEAN DEFAULT false
variance_threshold_pct NUMERIC(5,2) DEFAULT 15.0
```

**3. New table: `backroom_settings`** (org-level + location overrides)
```
organization_id, location_id (nullable for org default),
setting_key TEXT, setting_value JSONB,
updated_by, updated_at
UNIQUE(organization_id, location_id, setting_key)
```
This single flexible table handles all toggle/config settings with inheritance (org default → location override).

**4. New table: `service_tracking_components`**
```
organization_id, service_id, product_id,
component_role (required/optional/conditional/estimated/manual),
contributes_to_inventory BOOLEAN, contributes_to_cost BOOLEAN,
contributes_to_billing BOOLEAN, contributes_to_waste BOOLEAN,
contributes_to_forecast BOOLEAN,
estimated_quantity, unit
```

**5. New table: `allowance_buckets`**
```
organization_id, policy_id (FK service_allowance_policies),
bucket_name, mapped_product_categories TEXT[], mapped_product_ids UUID[],
included_quantity, included_unit,
overage_rate, overage_rate_type, overage_cap,
billing_label, is_taxable, requires_manager_override,
min_charge_threshold, rounding_rule, display_order
```

**6. New table: `backroom_alert_rules`**
```
organization_id, location_id (nullable),
rule_type (missing_reweigh, usage_variance, negative_inventory, waste_spike, stockout_risk, profitability, etc.),
threshold_value, threshold_unit,
severity (info/warning/critical),
creates_exception BOOLEAN, creates_task BOOLEAN,
notify_roles TEXT[], is_active BOOLEAN
```

**7. New table: `backroom_pricing_display_rules`**
```
organization_id, service_id (nullable for default),
display_mode (internal_only, client_visible, line_item),
line_item_label, show_usage_to_staff, show_usage_to_client,
auto_insert_checkout, requires_manager_approval,
allow_waive, allow_edit, apply_tax
```

## Navigation Structure

```
Backroom Settings (page)
├── Overview (setup health dashboard)
├── Products & Supplies
│   ├── Product Catalog (backroom filter on existing products)
│   └── Quick Product Buttons
├── Service Configuration
│   ├── Tracking & Components
│   └── Recipe Baselines
├── Allowances & Billing
│   ├── Allowance Policies
│   ├── Allowance Buckets
│   └── Pricing & Display Rules
├── Stations & Hardware
├── Inventory & Replenishment
├── Permissions
├── Alerts & Exceptions
├── Formula Assistance
│   ├── Smart Mix Assist
│   └── Disclaimers
└── Multi-Location (if multi-location org)
```

## Implementation Phases

### Phase 1 — Core Structure + Setup Overview (this build)

1. **Database migration** — Add columns to `products` and `services`, create `backroom_settings`, `service_tracking_components`, `allowance_buckets`, `backroom_alert_rules`, `backroom_pricing_display_rules` tables
2. **`BackroomSettingsPage.tsx`** — Standalone page with sidebar nav, route registration
3. **`BackroomSetupOverview.tsx`** — Setup health dashboard showing config completeness: products configured, services mapped, allowances set, stations assigned, etc. Health warnings for broken configs.
4. **`BackroomProductCatalogSection.tsx`** — Filter/configure products for backroom tracking: toggle `is_backroom_tracked`, set `depletion_method`, `cost_per_gram`, `unit_of_measure`, billable/overage/forecast flags
5. **`ServiceTrackingSection.tsx`** — Per-service backroom toggle + component mapping using `service_tracking_components`
6. **Hooks:** `useBackroomSettings` (generic key-value read/write with inheritance), `useServiceTrackingComponents`, `useBackroomSetupHealth`

### Phase 2 — Allowances, Billing, Stations

7. **`AllowanceBucketsSection.tsx`** — Multi-bucket allowance configuration per service
8. **`PricingDisplaySection.tsx`** — Checkout visibility and charge behavior rules
9. **`StationConfigSection.tsx`** — Wraps existing `useBackroomStations` with enhanced config UI
10. **`InventoryPolicySection.tsx`** — Reorder points, safety stock, lead times, forecast participation per product

### Phase 3 — Permissions, Alerts, Formula, Multi-Location

11. **`BackroomPermissionsSection.tsx`** — Role-based permission matrix for backroom actions
12. **`AlertRulesSection.tsx`** — Threshold configuration for Control Tower alerts
13. **`FormulaAssistSection.tsx`** — Wraps existing Smart Mix Assist settings + disclaimer config
14. **`MultiLocationSection.tsx`** — Compare, copy, bulk-apply settings across locations
15. **Import/Export utilities**

## Key Design Decisions

- **Settings inheritance:** `backroom_settings` uses `(org_id, location_id NULL)` for defaults, `(org_id, location_id)` for overrides. Hook resolves with fallback.
- **Products:** Not duplicated. Existing `products` table extended with backroom columns. The Product Catalog section filters to show backroom-relevant products.
- **Validation engine:** Pure TypeScript function `validateBackroomSetup(orgId)` returns typed warnings array. Runs on overview load and before critical saves.
- **Audit:** All settings mutations go through hooks that call `log_platform_action()`.

## Phase 1 Build Order

1. Database migration (extend products + services, create 5 new tables)
2. `useBackroomSettings.ts` — generic key-value settings with inheritance
3. `useServiceTrackingComponents.ts` — CRUD for service component mappings
4. `useBackroomSetupHealth.ts` — validation/health check hook
5. `BackroomSettingsPage.tsx` — page shell with sidebar nav
6. `BackroomSetupOverview.tsx` — health dashboard
7. `BackroomProductCatalogSection.tsx` — product backroom config
8. `ServiceTrackingSection.tsx` — service tracking + components
9. Route registration in `App.tsx` + sidebar link
10. `RecipeBaselineSection.tsx` — wraps existing `useServiceRecipeBaselines` with better UI

## Edge Cases

| Case | Handling |
|---|---|
| Product has no cost_price | Health warning: "X products missing unit cost" |
| Service has overage but no components | Validation error blocks overage save |
| Location override vs org default | UI shows inherited value with "Override" toggle |
| Bulk import with missing fields | Validation report before commit |
| Allowance bucket with no mapped products | Warning badge on bucket |

