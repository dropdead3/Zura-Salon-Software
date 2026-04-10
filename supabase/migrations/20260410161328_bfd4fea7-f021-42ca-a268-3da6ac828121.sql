INSERT INTO public.feature_flags (flag_key, flag_name, is_enabled, description, category)
VALUES ('connect_enabled', 'Zura Connect', false, 'Zura Connect — Team & Client Communications add-on', 'apps')
ON CONFLICT (flag_key) DO NOTHING;