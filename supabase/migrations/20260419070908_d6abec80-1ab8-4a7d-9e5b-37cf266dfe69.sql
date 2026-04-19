-- Backfill any NULL organization_id rows on service_category_colors
UPDATE public.service_category_colors
SET organization_id = (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1)
WHERE organization_id IS NULL;

-- Enforce NOT NULL going forward to prevent regression
ALTER TABLE public.service_category_colors
  ALTER COLUMN organization_id SET NOT NULL;