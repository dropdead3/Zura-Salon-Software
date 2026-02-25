-- Add is_onsite_staff column to employee_profiles
-- Defaults to true so existing staff are unaffected
ALTER TABLE public.employee_profiles 
ADD COLUMN IF NOT EXISTS is_onsite_staff BOOLEAN NOT NULL DEFAULT true;