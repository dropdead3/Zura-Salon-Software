
-- Drop the old restrictive write policy
DROP POLICY IF EXISTS "Leadership can manage visibility settings" ON public.dashboard_element_visibility;

-- Create a new policy that allows admin and manager roles (matching the permission system)
CREATE POLICY "Leadership can manage visibility settings"
ON public.dashboard_element_visibility
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR is_platform_user(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR is_platform_user(auth.uid())
);
