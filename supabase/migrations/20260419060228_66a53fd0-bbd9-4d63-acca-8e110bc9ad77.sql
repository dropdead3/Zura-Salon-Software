-- Wave 4: Repoint service_form_requirements.service_id from phorest_services to services
-- Both tables are empty (0 rows) so no data migration needed.

ALTER TABLE public.service_form_requirements
  DROP CONSTRAINT IF EXISTS service_form_requirements_service_id_fkey;

ALTER TABLE public.service_form_requirements
  ADD CONSTRAINT service_form_requirements_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;