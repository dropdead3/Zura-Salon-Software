
-- Add stylist_level_since column
ALTER TABLE public.employee_profiles
ADD COLUMN IF NOT EXISTS stylist_level_since TIMESTAMPTZ DEFAULT now();

-- Backfill: prefer latest promotion date, else updated_at
UPDATE public.employee_profiles ep
SET stylist_level_since = COALESCE(
  (SELECT lp.created_at FROM public.level_promotions lp
   WHERE lp.user_id = ep.user_id AND lp.organization_id = ep.organization_id
   ORDER BY lp.created_at DESC LIMIT 1),
  ep.updated_at
)
WHERE ep.stylist_level IS NOT NULL;
