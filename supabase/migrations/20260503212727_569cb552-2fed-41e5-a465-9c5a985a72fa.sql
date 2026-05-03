-- Wave 5: dedicated review click attribution table
CREATE TABLE IF NOT EXISTS public.review_click_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  feedback_response_id uuid NOT NULL,
  platform text NOT NULL CHECK (platform IN ('google','apple','yelp','facebook','copied','other')),
  clicked_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_click_events_org_time
  ON public.review_click_events (organization_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_click_events_response
  ON public.review_click_events (feedback_response_id);

ALTER TABLE public.review_click_events ENABLE ROW LEVEL SECURITY;

-- Org members can read their own org's events
CREATE POLICY "Org members read review click events"
  ON public.review_click_events
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Public insert is allowed only when a matching feedback response token exists
-- (the public client never sees feedback rows except via token-scoped RPC paths,
-- so this is effectively token-gated insert).
CREATE POLICY "Public insert review click events via valid response"
  ON public.review_click_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_feedback_responses r
      WHERE r.id = feedback_response_id
        AND r.organization_id = review_click_events.organization_id
    )
  );