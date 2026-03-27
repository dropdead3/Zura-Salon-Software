-- Add platform user bypass to tasks table policies
CREATE POLICY "Platform users can manage all tasks"
ON public.tasks
FOR ALL
TO authenticated
USING (public.is_platform_user(auth.uid()))
WITH CHECK (public.is_platform_user(auth.uid()));

-- Add platform user bypass to user_preferences table policies
CREATE POLICY "Platform users can manage all preferences"
ON public.user_preferences
FOR ALL
TO authenticated
USING (public.is_platform_user(auth.uid()))
WITH CHECK (public.is_platform_user(auth.uid()));