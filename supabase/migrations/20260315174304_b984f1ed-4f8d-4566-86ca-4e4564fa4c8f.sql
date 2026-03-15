
-- Wholesale Price Sources: configures which distributor APIs to poll
CREATE TABLE IF NOT EXISTS public.wholesale_price_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'api',
  api_endpoint TEXT,
  api_key_secret_name TEXT,
  scrape_frequency TEXT NOT NULL DEFAULT 'weekly',
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_apply_threshold NUMERIC DEFAULT 0.95,
  max_auto_delta_pct NUMERIC DEFAULT 3.0,
  last_polled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wholesale_price_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform users can manage price sources"
  ON public.wholesale_price_sources FOR ALL
  USING (public.is_platform_user(auth.uid()))
  WITH CHECK (public.is_platform_user(auth.uid()));

-- Wholesale Price Queue: staging table for admin review
CREATE TYPE public.price_queue_status AS ENUM ('pending', 'approved', 'rejected', 'auto_applied');

CREATE TABLE IF NOT EXISTS public.wholesale_price_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  brand TEXT NOT NULL,
  sku TEXT,
  source_id UUID REFERENCES public.wholesale_price_sources(id) ON DELETE CASCADE,
  wholesale_price NUMERIC NOT NULL,
  recommended_retail NUMERIC,
  currency TEXT NOT NULL DEFAULT 'USD',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status price_queue_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  confidence_score NUMERIC DEFAULT 0,
  previous_price NUMERIC,
  price_delta_pct NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wholesale_price_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform users can manage price queue"
  ON public.wholesale_price_queue FOR ALL
  USING (public.is_platform_user(auth.uid()))
  WITH CHECK (public.is_platform_user(auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_price_queue_status ON public.wholesale_price_queue(status);
CREATE INDEX IF NOT EXISTS idx_price_queue_brand ON public.wholesale_price_queue(brand);
CREATE INDEX IF NOT EXISTS idx_price_queue_source ON public.wholesale_price_queue(source_id);
CREATE INDEX IF NOT EXISTS idx_price_sources_brand ON public.wholesale_price_sources(brand);

-- Updated_at trigger for sources
CREATE TRIGGER update_wholesale_price_sources_updated_at
  BEFORE UPDATE ON public.wholesale_price_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_backroom_updated_at();
