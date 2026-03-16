
-- Create fulfillment status enum
CREATE TYPE public.fulfillment_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');

-- Create hardware_orders table
CREATE TABLE IF NOT EXISTS public.hardware_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_checkout_session_id TEXT,
  stripe_subscription_id TEXT,
  item_type TEXT NOT NULL DEFAULT 'precision_scale',
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL DEFAULT 19900,
  fulfillment_status fulfillment_status NOT NULL DEFAULT 'pending',
  shipping_carrier TEXT,
  tracking_number TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  shipping_address JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hardware_orders ENABLE ROW LEVEL SECURITY;

-- Platform users can view all orders
CREATE POLICY "Platform users can view all hardware orders"
  ON public.hardware_orders FOR SELECT
  USING (public.is_platform_user(auth.uid()));

-- Platform users can update orders (fulfillment management)
CREATE POLICY "Platform users can update hardware orders"
  ON public.hardware_orders FOR UPDATE
  USING (public.is_platform_user(auth.uid()));

-- Platform users can insert orders (webhook runs as service role, but allow manual creation)
CREATE POLICY "Platform users can insert hardware orders"
  ON public.hardware_orders FOR INSERT
  WITH CHECK (public.is_platform_user(auth.uid()));

-- Org admins can view their own orders
CREATE POLICY "Org admins can view own hardware orders"
  ON public.hardware_orders FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Updated_at trigger
CREATE TRIGGER update_hardware_orders_updated_at
  BEFORE UPDATE ON public.hardware_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_backroom_updated_at();

-- Index for org lookups
CREATE INDEX IF NOT EXISTS idx_hardware_orders_org
  ON public.hardware_orders(organization_id);

-- Index for fulfillment status filtering
CREATE INDEX IF NOT EXISTS idx_hardware_orders_status
  ON public.hardware_orders(fulfillment_status);
