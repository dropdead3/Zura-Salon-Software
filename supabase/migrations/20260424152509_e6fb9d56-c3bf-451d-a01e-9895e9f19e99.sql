-- Address security linter: SECURITY DEFINER VIEW (lint 0010).
-- The view aggregates phorest_appointments, which has its own RLS. Setting
-- security_invoker = true makes the view enforce RLS with the caller's
-- identity rather than the view owner's, which is the correct posture for
-- a derived stats view.
ALTER VIEW public.v_client_visit_stats SET (security_invoker = true);
