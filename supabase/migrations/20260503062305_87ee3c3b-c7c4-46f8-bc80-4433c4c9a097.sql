-- Platform-side read access for Reputation dispatch monitor.
-- Operators (org admins) keep their existing per-org SELECT policy untouched;
-- this policy is additive and scoped to platform staff only.

CREATE POLICY "Platform staff view all dispatch queue rows"
  ON public.review_request_dispatch_queue
  FOR SELECT
  TO authenticated
  USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform staff view all sms opt outs"
  ON public.sms_opt_outs
  FOR SELECT
  TO authenticated
  USING (public.is_platform_user(auth.uid()));