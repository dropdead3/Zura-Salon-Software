-- Infrastructure metrics time-series table
CREATE TABLE IF NOT EXISTS public.infrastructure_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL,
  metric_key text NOT NULL,
  value numeric NOT NULL,
  unit text,
  threshold_warning numeric,
  threshold_critical numeric,
  status text DEFAULT 'normal',
  metadata jsonb DEFAULT '{}',
  recorded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_infra_metrics_type_recorded
  ON public.infrastructure_metrics(metric_type, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_infra_metrics_recorded_at
  ON public.infrastructure_metrics(recorded_at DESC);

ALTER TABLE public.infrastructure_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform users can read infrastructure metrics"
  ON public.infrastructure_metrics FOR SELECT
  USING (public.is_platform_user(auth.uid()));

-- RPC: DB connection pool stats
CREATE OR REPLACE FUNCTION public.get_db_connection_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'active', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'),
    'idle', (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle'),
    'total', (SELECT count(*) FROM pg_stat_activity),
    'max', current_setting('max_connections')::int
  );
$$;

-- RPC: Storage bucket stats
CREATE OR REPLACE FUNCTION public.get_storage_bucket_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(bucket_stats), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'bucket_id', bucket_id,
      'file_count', count(*),
      'total_bytes', COALESCE(sum((metadata->>'size')::bigint), 0)
    ) as bucket_stats
    FROM storage.objects
    GROUP BY bucket_id
  ) sub;
$$;