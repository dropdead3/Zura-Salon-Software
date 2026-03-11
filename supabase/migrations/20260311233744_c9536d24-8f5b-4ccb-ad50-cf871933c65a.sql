
CREATE TABLE IF NOT EXISTS public.product_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_data jsonb NOT NULL DEFAULT '{}',
  current_step integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own drafts" ON public.product_drafts
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_product_drafts_updated_at
  BEFORE UPDATE ON public.product_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
