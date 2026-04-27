-- Switch the view to security_invoker so it enforces the querying user's RLS,
-- not the view owner's. Underlying tables (announcement_reads, employee_profiles)
-- already have admin-scoped policies.
ALTER VIEW public.announcement_read_stats SET (security_invoker = true);