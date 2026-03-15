
CREATE TABLE IF NOT EXISTS public.platform_kpi_counters (
  key TEXT PRIMARY KEY,
  value BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_kpi_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform users can read counters"
  ON public.platform_kpi_counters FOR SELECT
  TO authenticated
  USING (public.is_platform_user(auth.uid()));

INSERT INTO public.platform_kpi_counters (key, value) VALUES ('backroom_coaching_emails_sent', 0);
