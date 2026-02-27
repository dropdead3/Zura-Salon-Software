-- Fix RLS policy to include super_admin role
DROP POLICY "Admins can manage specialty options" ON public.specialty_options;

CREATE POLICY "Admins can manage specialty options"
ON public.specialty_options
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY (ARRAY['admin'::app_role, 'manager'::app_role, 'super_admin'::app_role])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY (ARRAY['admin'::app_role, 'manager'::app_role, 'super_admin'::app_role])
  )
);