INSERT INTO public.feature_flags (flag_key, flag_name, is_enabled, description)
VALUES ('payroll_enabled', 'Payroll Enabled', false, 'Enables Zura Payroll (Gusto-powered payroll processing)')
ON CONFLICT (flag_key) DO NOTHING;