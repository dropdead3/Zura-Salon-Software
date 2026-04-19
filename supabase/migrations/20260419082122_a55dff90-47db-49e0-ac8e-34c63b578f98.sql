
DROP TABLE IF EXISTS public.handbook_versions CASCADE;
DROP TABLE IF EXISTS public.handbook_org_setup CASCADE;
DROP TABLE IF EXISTS public.handbook_section_library CASCADE;
DROP TABLE IF EXISTS public.handbook_sections CASCADE;
DROP TABLE IF EXISTS public.handbook_role_overlays CASCADE;
DROP TABLE IF EXISTS public.handbook_review_issues CASCADE;
-- Drop unused enums from failed attempt
DROP TYPE IF EXISTS public.handbook_status CASCADE;
DROP TYPE IF EXISTS public.handbook_version_status CASCADE;
DROP TYPE IF EXISTS public.handbook_section_status CASCADE;
DROP TYPE IF EXISTS public.handbook_review_severity CASCADE;
