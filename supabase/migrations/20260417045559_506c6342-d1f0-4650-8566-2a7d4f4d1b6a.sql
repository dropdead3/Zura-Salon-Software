-- Auto-populate affected_location_count on color_bar_suspension_events inserts.
-- Preserves explicit caller-supplied values via COALESCE; otherwise counts the
-- source state of the transition from current entitlement records.
--   - 'suspended' event: counts locations currently 'active' (about to be suspended)
--   - 'reactivated' event: counts locations currently 'suspended' (about to be reactivated)
-- Note: column is already NOT NULL DEFAULT 0 at the schema level. The trigger
-- treats the default 0 as "unspecified" and replaces it with the live count.

CREATE OR REPLACE FUNCTION public.populate_suspension_event_location_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  computed_count integer;
BEGIN
  -- Only auto-populate when caller did not specify (NULL or default 0).
  IF NEW.affected_location_count IS NULL OR NEW.affected_location_count = 0 THEN
    SELECT COUNT(*)::int
      INTO computed_count
      FROM public.backroom_location_entitlements
     WHERE organization_id = NEW.organization_id
       AND status = CASE
         WHEN NEW.event_type = 'suspended'   THEN 'active'
         WHEN NEW.event_type = 'reactivated' THEN 'suspended'
         ELSE NULL
       END;

    NEW.affected_location_count := COALESCE(computed_count, 0);
  END IF;

  -- Hard guard: never allow NULL into the audit feed.
  IF NEW.affected_location_count IS NULL THEN
    NEW.affected_location_count := 0;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_populate_suspension_event_count ON public.color_bar_suspension_events;

CREATE TRIGGER trg_populate_suspension_event_count
  BEFORE INSERT ON public.color_bar_suspension_events
  FOR EACH ROW EXECUTE FUNCTION public.populate_suspension_event_location_count();