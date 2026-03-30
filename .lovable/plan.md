

## Service Discount System: Booking-Aware Expected Revenue

### Observation

The screenshot shows Scheduled Service Revenue of $213.00 but actual collected was $106.50 — exactly 50% off. This was a **model service** with a known discount applied at POS checkout. The gap analysis correctly tags it as a "Discount" reason *after* the fact, but the **expected revenue forecast** uses the full `total_price` from `phorest_appointments`, which has zero discount awareness.

The result: inflated "Scheduled Services Today" numbers and a misleading gap that isn't really lost revenue — it's a pre-known discount.

### What We Need (3 Phases)

---

**Phase 1 — Discount Data Model + Appointment Awareness** (build now)

Add discount columns to `phorest_appointments` so expected revenue calculations can use the discounted price instead of full price.

**Database migration:**
- Add to `phorest_appointments`:
  - `discount_type TEXT` — `'percentage'`, `'fixed'`, `'model'`, `'comp'`, `'custom'`
  - `discount_value NUMERIC` — the raw discount (e.g., 50 for 50%, or 25.00 for $25 off)
  - `discount_amount NUMERIC DEFAULT 0` — computed dollar amount of the discount
  - `expected_price NUMERIC` — `total_price - discount_amount` (what we actually expect to collect)
  - `discount_reason TEXT` — free text ("Model service", "Training client", "VIP comp", etc.)
  - `discount_id UUID` — optional FK to a `service_discounts` configurator table (Phase 2)

**Create `service_discounts` configurator table:**
```sql
CREATE TABLE public.service_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- "Model Rate", "Training Client", "Employee Discount"
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL,       -- 50 (for 50%) or 25.00 (for $25 off)
  applies_to TEXT DEFAULT 'all_services', -- 'all_services', 'specific_services', 'specific_categories'
  applicable_service_ids UUID[],
  applicable_categories TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
- RLS: org member read, org admin write
- Standard indexes on `organization_id` and `is_active`

**Hook updates:**
- `useAdjustedExpectedRevenue` — use `COALESCE(expected_price, total_price)` instead of raw `total_price` for pending appointments
- `useScheduledRevenue` — same: prefer `expected_price` when available
- Both hooks return both the original scheduled and discount-adjusted totals so the UI can show "Scheduled $213 → Expected $106.50"

**UI updates in AggregateSalesCard:**
- "Scheduled Services Today" shows the discount-adjusted expected total
- If discounts exist, show a subtle "(X discounts applied)" indicator
- Gap analysis: discount-reason items from known pre-booked discounts are separated from unexpected POS discounts

---

**Phase 2 — Discount Configurator UI** (next)

Admin settings page (`/dashboard/admin/service-discounts`) for creating and managing reusable discount templates:
- CRUD for service discounts (Model Rate, Training, Employee, VIP Comp, etc.)
- Percentage vs fixed amount
- Service/category scoping
- Active/inactive toggle
- Used by the booking flow to apply discounts

---

**Phase 3 — Booking Flow Discount Application** (after Phase 2)

Update the booking/scheduling flow to:
- Show available discounts when booking a service
- Apply discount at booking time → writes `discount_type`, `discount_value`, `discount_amount`, `expected_price` to the appointment
- Replace the current "Any discounts or promotions will be calculated at checkout" disclaimer with actual discount selection
- POS sync edge function maps POS-side discounts back to appointment records

---

### Implementation Plan (Phase 1 — what ships now)

| Step | File(s) | Change |
|------|---------|--------|
| 1 | Migration SQL | Add discount columns to `phorest_appointments` + create `service_discounts` table |
| 2 | `src/hooks/useAdjustedExpectedRevenue.ts` | Select `expected_price`, use `COALESCE(expected_price, total_price)` for pending revenue |
| 3 | `src/hooks/useRevenueGapAnalysis.ts` | Use `expected_price` as the baseline for gap calculations; known discounts reduce expected, not create false gaps |
| 4 | `src/hooks/useScheduledRevenue.ts` | Add optional `useExpectedPrice` flag to return discount-adjusted totals |
| 5 | `src/components/dashboard/AggregateSalesCard.tsx` | Show discount-adjusted expected; add discount indicator when discounts are present |

### Technical Detail

The key insight: `expected_price = total_price - discount_amount`. When `expected_price` is NULL (no discount applied), fall back to `total_price`. This is backward-compatible — all existing appointments without discounts behave exactly as before.

The `service_discounts` table is created now (Phase 1) so the schema is ready, but the configurator UI and booking integration come in Phases 2 and 3.

