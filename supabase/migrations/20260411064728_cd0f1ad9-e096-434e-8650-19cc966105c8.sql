
-- Create signal type enum
CREATE TYPE public.industry_signal_type AS ENUM (
  'demand_shift',
  'keyword_trend',
  'price_signal',
  'effectiveness_pattern',
  'conversion_pattern'
);

-- Create direction enum
CREATE TYPE public.trend_direction AS ENUM ('rising', 'stable', 'declining');

-- Create confidence enum
CREATE TYPE public.trend_confidence AS ENUM ('low', 'medium', 'high');

-- Industry Trend Signals (platform-scoped, no org identity)
CREATE TABLE IF NOT EXISTS public.industry_trend_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type public.industry_signal_type NOT NULL,
  category TEXT NOT NULL,
  city TEXT,
  metric_key TEXT NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  previous_value NUMERIC NOT NULL DEFAULT 0,
  delta_pct NUMERIC NOT NULL DEFAULT 0,
  direction public.trend_direction NOT NULL DEFAULT 'stable',
  cohort_size INTEGER NOT NULL DEFAULT 0,
  confidence public.trend_confidence NOT NULL DEFAULT 'low',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  insight_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.industry_trend_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view trend signals"
  ON public.industry_trend_signals FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_industry_trend_signals_type_category
  ON public.industry_trend_signals(signal_type, category);

CREATE INDEX IF NOT EXISTS idx_industry_trend_signals_expires
  ON public.industry_trend_signals(expires_at);

-- Industry Benchmarks (platform-scoped, no org identity)
CREATE TABLE IF NOT EXISTS public.industry_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  city TEXT,
  metric_key TEXT NOT NULL,
  p25 NUMERIC NOT NULL DEFAULT 0,
  p50 NUMERIC NOT NULL DEFAULT 0,
  p75 NUMERIC NOT NULL DEFAULT 0,
  p90 NUMERIC NOT NULL DEFAULT 0,
  cohort_size INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  period TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.industry_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view benchmarks"
  ON public.industry_benchmarks FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_industry_benchmarks_category_metric
  ON public.industry_benchmarks(category, metric_key);
