CREATE POLICY "Public can view active organizations by slug"
  ON public.organizations
  FOR SELECT
  USING (status = 'active');