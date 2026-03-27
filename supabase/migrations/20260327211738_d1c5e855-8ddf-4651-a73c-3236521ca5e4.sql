DROP POLICY IF EXISTS "Super admins can manage visibility settings" ON public.dashboard_element_visibility;

CREATE POLICY "Leadership can manage visibility settings"
ON public.dashboard_element_visibility
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employee_profiles
    WHERE user_id = auth.uid()
    AND is_super_admin = true
  )
  OR public.is_platform_user(auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employee_profiles
    WHERE user_id = auth.uid()
    AND is_super_admin = true
  )
  OR public.is_platform_user(auth.uid())
);