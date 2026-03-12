

# Backroom Enhancements — Priority Features

Six high-impact features that strengthen adoption, intelligence, and operational efficiency. Builds on existing Phase 1-5 infrastructure with minimal schema changes.

---

## 1. Quick Product Buttons

**Problem:** Stylists search the same 5-10 products every session. Searching is slow with gloves on.

**Schema change:** New table `staff_pinned_products` — per-user product shortcuts.

```sql
CREATE TABLE public.staff_pinned_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
-- RLS: users can CRUD their own rows
```

**New hook:** `useStaffPinnedProducts(userId)` — fetch + reorder + toggle pin.

**UI change in `LiveBowlCard.tsx`:** Above the inline product search, render a row of large tap-target buttons (one per pinned product). Tapping a quick button opens the weight capture inline immediately — skipping the search step entirely. A "pin" icon in `AddProductToBowl` search results lets users pin/unpin products.

---

## 2. Formula Cloning

**Problem:** Stylists re-create the same formula manually every visit.

**No schema change.** Uses existing `client_formula_history` table.

**New component:** `FormulaClonePanel.tsx` — appears in `MixSessionManager` when a session is in `draft` or `mixing` status and the client has formula history.

- Shows "Last Visit Formula" and any saved formulas
- "Use This Formula" button clones all lines into the active bowl via batch `addBowlLine` calls
- Product availability check: marks out-of-stock products with a warning badge

**New hook:** `useCloneFormula()` — takes a `ClientFormula`, creates bowl lines from `formula_data`.

---

## 3. Assistant Prep Mode

**Problem:** Assistants pre-mix bowls before the stylist arrives, but there's no approval workflow.

**Schema change:** Add column to `mix_sessions`:

```sql
ALTER TABLE public.mix_sessions
  ADD COLUMN IF NOT EXISTS is_prep_mode BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS prep_approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS prep_approved_at TIMESTAMPTZ;
```

**UI changes:**
- `MixSessionManager`: New "Prep Mode" toggle on the start session screen. When enabled, `is_prep_mode = true` and session stays in `draft` status after bowls are prepared.
- When the stylist opens the appointment, they see a "Review & Approve Prep" banner showing who prepared it. Approving transitions session to `mixing` and records `prep_approved_by`.
- Only the assigned stylist or managers can approve prep.

---

## 4. Mix Confidence Score

**Problem:** Analytics are polluted by incomplete sessions. Managers can't tell which data is reliable.

**Schema change:** Add column to `mix_sessions`:

```sql
ALTER TABLE public.mix_sessions
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC DEFAULT 0;
```

**Calculation module:** `calculateMixConfidence()` in `analytics-engine.ts`:

| Factor | Weight | Scoring |
|---|---|---|
| Scale vs manual entry | 30% | 100 if all scale, 60 if all manual |
| Reweigh completion | 25% | 100 if all bowls reweighed, 0 if none |
| Variance from baseline | 25% | 100 if within ±10%, scaled down to 0 at ±50% |
| Waste classification | 20% | 100 if all waste categorized, 0 if unclassified |

Score calculated on session completion in `handleCompleteSession` and persisted to the column.

**UI:** Badge on `SessionSummary` and `CompletedSessionSummary` showing the score with color coding (green ≥ 85, amber ≥ 60, red < 60). Exception inbox generates a `low_confidence` exception when score < 60.

---

## 5. Chemical Cost Trend Alerts

**Problem:** Cost drift goes unnoticed until end-of-month reports.

**No new tables.** Uses existing `backroom_exceptions` table.

**New logic in `generate-backroom-snapshots` edge function:** After computing daily snapshot, compare `avg_chemical_cost_per_service` against the rolling 28-day average. If current day exceeds 2x the rolling average, insert a `cost_spike` exception with severity `warning`. If exceeding 3x, severity `critical`.

**New hook:** `useChemicalCostTrend(serviceId?, days?)` — queries `backroom_analytics_snapshots` for the time series, returns trend data for a Recharts line chart.

**UI:** Small trend sparkline on the Owner dashboard chemical cost card. Alert badge when cost spikes are detected.

---

## 6. Smart Product Substitution

**Problem:** Out-of-stock products halt service. Stylists improvise without guidance.

**Schema change:** New table for product relationships:

```sql
CREATE TABLE public.product_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  substitute_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  priority INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, product_id, substitute_product_id)
);
-- RLS: org_member SELECT, org_admin ALL
```

**New hook:** `useProductSubstitutions(productId)` — returns ranked substitutes with stock availability.

**UI change in `AddProductToBowl.tsx`:** When a selected product has `quantity_on_hand <= 0`, show an amber "Out of Stock" banner with substitute suggestions below it. Each substitute shows name, available quantity, and cost difference. Tapping a substitute selects it instead.

**Settings UI:** Simple admin page under Inventory settings to manage substitution mappings per product.

---

## Implementation Order

1. **Migration:** Create `staff_pinned_products`, `product_substitutions` tables + alter `mix_sessions` (confidence_score, prep columns)
2. **Quick Product Buttons:** Hook + UI in LiveBowlCard
3. **Formula Cloning:** Hook + FormulaClonePanel in MixSessionManager
4. **Mix Confidence Score:** Calculation in analytics-engine + persistence on session complete + UI badges
5. **Assistant Prep Mode:** Session flag + approval workflow UI
6. **Smart Product Substitution:** Hook + out-of-stock detection in AddProductToBowl
7. **Chemical Cost Trend Alerts:** Logic in snapshot edge function + trend hook + sparkline

