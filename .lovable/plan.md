

## Enhanced Audit Trail: Filters, Export, and Bulk View

### What We're Building

Three enhancements to the inventory audit trail system:

1. **Filterable audit trail** — Add type filter (Stock / Settings / All) and date range picker to the existing `InventoryAuditDialog`
2. **CSV/PDF export** — Export filtered audit entries from the dialog for compliance reporting
3. **Bulk audit view** — A new "Audit Log" tab (6th tab) in BackroomInventorySection showing changes across ALL products for a date range, with product name column and the same filters/export

### Changes

#### 1. Enhance `useInventoryAuditTrail` hook

**File:** `src/hooks/backroom/useInventoryAuditTrail.ts`

- Add optional filters param: `{ typeFilter?: 'stock' | 'setting' | 'all'; dateFrom?: Date; dateTo?: Date }`
- Apply date range filters to both `stock_movements` and `inventory_settings_audit` queries
- When `typeFilter` is set, skip the irrelevant query entirely (e.g., only fetch stock_movements if `typeFilter === 'stock'`)

#### 2. Create `useBulkInventoryAuditTrail` hook

**File:** `src/hooks/backroom/useBulkInventoryAuditTrail.ts` (new)

- Similar to `useInventoryAuditTrail` but fetches across ALL products for the org (no `productId` filter)
- Joins product name from `products` table for display
- Extends `AuditEntry` with `product_name` and `product_id`
- Supports same filters: type, date range, plus search text
- Paginated (page/pageSize) since bulk data can be large

#### 3. Enhance `InventoryAuditDialog` — Add filters + export

**File:** `src/components/dashboard/backroom-settings/inventory/InventoryAuditDialog.tsx`

- Add filter bar below header: Type select (All / Stock Changes / Setting Changes) + date range (two date inputs)
- Pass filters to `useInventoryAuditTrail`
- Add CSV and PDF export buttons in the header area
- CSV: timestamp, type, field, change, after, user, notes
- PDF: uses `jsPDF` + `jspdf-autotable` with `reportPdfLayout` pattern, titled "Audit Trail — {productName}"

#### 4. Create `AuditLogTab` — Bulk cross-product audit view

**File:** `src/components/dashboard/backroom-settings/inventory/AuditLogTab.tsx` (new)

- Table view (not timeline) for efficiency with bulk data: columns = Timestamp, Product, Type, Field, Change, After, User, Notes
- Filter bar: Type select, date range picker, search input
- CSV + PDF export of visible data
- Uses `useBulkInventoryAuditTrail` hook
- Pagination controls

#### 5. Add "Audit" tab to BackroomInventorySection

**File:** `src/components/dashboard/backroom-settings/BackroomInventorySection.tsx`

- Add 6th tab: `<TabsTrigger value="audit">` with `History` icon and "Audit Log" label
- Render `<AuditLogTab locationId={effectiveLocationId} />`

### Files

| File | Action |
|------|--------|
| `src/hooks/backroom/useInventoryAuditTrail.ts` | **Edit** — Add type/date filters |
| `src/hooks/backroom/useBulkInventoryAuditTrail.ts` | **Create** — Cross-product audit query with pagination |
| `src/components/dashboard/backroom-settings/inventory/InventoryAuditDialog.tsx` | **Edit** — Filter bar + CSV/PDF export |
| `src/components/dashboard/backroom-settings/inventory/AuditLogTab.tsx` | **Create** — Bulk audit table view |
| `src/components/dashboard/backroom-settings/BackroomInventorySection.tsx` | **Edit** — Add Audit Log tab |

