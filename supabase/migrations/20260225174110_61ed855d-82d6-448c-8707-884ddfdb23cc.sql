
-- ============================================================
-- Phase 1: Schema Completion for Phorest Detachment
-- ============================================================

-- ============================================================
-- 1a. Create native transaction_items table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL,
  staff_user_id UUID REFERENCES public.employee_profiles(user_id),
  staff_name TEXT,
  client_id UUID REFERENCES public.clients(id),
  client_name TEXT,
  location_id TEXT,
  branch_name TEXT,
  transaction_date DATE NOT NULL,
  item_type TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_category TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC,
  discount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  tax_amount NUMERIC DEFAULT 0,
  tip_amount NUMERIC DEFAULT 0,
  payment_method TEXT,
  sale_classification TEXT DEFAULT 'standard',
  promotion_id UUID,
  appointment_id UUID,
  external_id TEXT,
  import_source TEXT,
  imported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view transaction_items"
  ON public.transaction_items FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert transaction_items"
  ON public.transaction_items FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update transaction_items"
  ON public.transaction_items FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete transaction_items"
  ON public.transaction_items FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_transaction_items_org ON public.transaction_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_date ON public.transaction_items(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transaction_items_staff ON public.transaction_items(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_client ON public.transaction_items(client_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_location ON public.transaction_items(location_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_external ON public.transaction_items(external_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_txn_id ON public.transaction_items(transaction_id);

CREATE TRIGGER update_transaction_items_updated_at
  BEFORE UPDATE ON public.transaction_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 1b. Create native daily_sales_summary table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_sales_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_user_id UUID REFERENCES public.employee_profiles(user_id),
  location_id TEXT,
  branch_name TEXT,
  summary_date DATE NOT NULL,
  total_services INTEGER DEFAULT 0,
  total_products INTEGER DEFAULT 0,
  service_revenue NUMERIC DEFAULT 0,
  product_revenue NUMERIC DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  average_ticket NUMERIC DEFAULT 0,
  total_discounts NUMERIC DEFAULT 0,
  external_id TEXT,
  import_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_sales_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view daily_sales_summary"
  ON public.daily_sales_summary FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert daily_sales_summary"
  ON public.daily_sales_summary FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update daily_sales_summary"
  ON public.daily_sales_summary FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete daily_sales_summary"
  ON public.daily_sales_summary FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_daily_sales_org ON public.daily_sales_summary(organization_id);
CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON public.daily_sales_summary(summary_date);
CREATE INDEX IF NOT EXISTS idx_daily_sales_staff ON public.daily_sales_summary(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_daily_sales_location ON public.daily_sales_summary(location_id);

CREATE TRIGGER update_daily_sales_summary_updated_at
  BEFORE UPDATE ON public.daily_sales_summary
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 1c. Add missing columns to appointments (parity with phorest_appointments)
-- ============================================================
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS phorest_client_id TEXT,
  ADD COLUMN IF NOT EXISTS phorest_staff_id TEXT,
  ADD COLUMN IF NOT EXISTS is_new_client BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rebook_declined_reason TEXT,
  ADD COLUMN IF NOT EXISTS rescheduled_from_date DATE,
  ADD COLUMN IF NOT EXISTS rescheduled_from_time TIME,
  ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS recurrence_rule JSONB,
  ADD COLUMN IF NOT EXISTS recurrence_group_id UUID,
  ADD COLUMN IF NOT EXISTS recurrence_index INTEGER;

-- ============================================================
-- 1d. Add missing columns to clients (parity with phorest_clients)
-- ============================================================
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS referred_by TEXT,
  ADD COLUMN IF NOT EXISTS client_category TEXT,
  ADD COLUMN IF NOT EXISTS prompt_client_notes BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS prompt_appointment_notes BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT,
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS banned_by UUID,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID,
  ADD COLUMN IF NOT EXISTS preferred_services TEXT[],
  ADD COLUMN IF NOT EXISTS branch_name TEXT,
  ADD COLUMN IF NOT EXISTS first_visit TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS landline TEXT;
