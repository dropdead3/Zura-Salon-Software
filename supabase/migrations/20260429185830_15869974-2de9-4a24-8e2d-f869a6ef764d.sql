ALTER TABLE public.employee_profiles
  ADD COLUMN IF NOT EXISTS employee_number text;

CREATE UNIQUE INDEX IF NOT EXISTS employee_profiles_org_employee_number_key
  ON public.employee_profiles (organization_id, employee_number)
  WHERE employee_number IS NOT NULL;

COMMENT ON COLUMN public.employee_profiles.employee_number IS
  'HR-issued employee number (Gusto, ADP, etc.). Unique within an organization. NULL until payroll import populates it; UI falls back to last-8 of user_id.';