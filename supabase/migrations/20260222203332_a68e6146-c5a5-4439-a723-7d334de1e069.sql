-- Create a security definer function to check if a user is an org owner
-- This bypasses RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_org_owner(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_admins
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = 'owner'
  )
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Org owners can manage their org admins" ON public.organization_admins;

-- Recreate with the security definer function (no recursion)
CREATE POLICY "Org owners can manage their org admins"
ON public.organization_admins
FOR ALL
USING (public.is_org_owner(auth.uid(), organization_id));