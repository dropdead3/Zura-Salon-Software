-- Track per-user views of appointment detail tabs (e.g. 'photos')
CREATE TABLE IF NOT EXISTS public.appointment_tab_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id TEXT NOT NULL,
  tab_key TEXT NOT NULL,
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, appointment_id, tab_key)
);

CREATE INDEX IF NOT EXISTS idx_appointment_tab_views_user_appt
  ON public.appointment_tab_views(user_id, appointment_id);

ALTER TABLE public.appointment_tab_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tab views"
  ON public.appointment_tab_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tab views"
  ON public.appointment_tab_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tab views"
  ON public.appointment_tab_views FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tab views"
  ON public.appointment_tab_views FOR DELETE
  USING (auth.uid() = user_id);
