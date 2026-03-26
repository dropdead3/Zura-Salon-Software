-- Fix: Allow same product in multiple bowls by including bowl_id in unique constraint
-- First, make bowl_id NOT NULL with a default for existing rows
ALTER TABLE public.service_recipe_baselines 
  ALTER COLUMN bowl_id SET DEFAULT gen_random_uuid();

-- Update any existing NULL bowl_ids to a generated UUID
UPDATE public.service_recipe_baselines 
  SET bowl_id = gen_random_uuid() 
  WHERE bowl_id IS NULL;

-- Make bowl_id NOT NULL
ALTER TABLE public.service_recipe_baselines 
  ALTER COLUMN bowl_id SET NOT NULL;

-- Drop old constraint and add new one including bowl_id
ALTER TABLE public.service_recipe_baselines 
  DROP CONSTRAINT service_recipe_baselines_organization_id_service_id_product_key;

ALTER TABLE public.service_recipe_baselines 
  ADD CONSTRAINT service_recipe_baselines_org_service_product_bowl_key 
  UNIQUE (organization_id, service_id, product_id, bowl_id);

-- Remove the default since we always provide bowl_id explicitly
ALTER TABLE public.service_recipe_baselines 
  ALTER COLUMN bowl_id DROP DEFAULT;