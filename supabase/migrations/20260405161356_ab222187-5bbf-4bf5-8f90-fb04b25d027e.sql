CREATE TABLE public.demo_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_text TEXT NOT NULL,
  matched_feature_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_queries ENABLE ROW LEVEL SECURITY;

-- No public policies — only service-role inserts from edge functions