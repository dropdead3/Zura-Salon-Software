-- Seed known toner/gloss services with bottle container type
UPDATE public.services
SET container_types = '{bottle}'
WHERE container_types = '{bowl}'
  AND (
    LOWER(name) LIKE '%toner%'
    OR LOWER(name) LIKE '%gloss%'
    OR LOWER(name) LIKE '%glaze%'
    OR LOWER(name) LIKE '%rinse%'
  );

UPDATE public.phorest_services
SET container_types = '{bottle}'
WHERE container_types = '{bowl}'
  AND (
    LOWER(name) LIKE '%toner%'
    OR LOWER(name) LIKE '%gloss%'
    OR LOWER(name) LIKE '%glaze%'
    OR LOWER(name) LIKE '%rinse%'
  );