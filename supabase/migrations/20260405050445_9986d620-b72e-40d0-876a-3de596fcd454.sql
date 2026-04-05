CREATE POLICY "Anon can read platform branding"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (organization_id IS NULL AND id = 'platform_branding');