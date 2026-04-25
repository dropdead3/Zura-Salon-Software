
-- Make the coverage view enforce the querying user's RLS, not the view owner's.
ALTER VIEW public.v_linkage_coverage_30d SET (security_invoker = true);

-- Lock down writes to tip_attribution_drift; only the system populates it.
CREATE POLICY "No client writes to tip drift"
  ON public.tip_attribution_drift FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No client updates to tip drift"
  ON public.tip_attribution_drift FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No client deletes from tip drift"
  ON public.tip_attribution_drift FOR DELETE
  USING (false);
