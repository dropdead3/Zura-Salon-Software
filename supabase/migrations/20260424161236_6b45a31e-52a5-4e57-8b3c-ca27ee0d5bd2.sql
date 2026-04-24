UPDATE public.phorest_services
SET name = btrim(name)
WHERE name IS DISTINCT FROM btrim(name);