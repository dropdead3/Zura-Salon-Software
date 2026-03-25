
-- Create container_type enum
CREATE TYPE public.container_type AS ENUM ('bowl', 'bottle');

-- Add container_types to services table (array, default to bowl)
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS container_types public.container_type[] NOT NULL DEFAULT '{bowl}';

-- Add container_types to phorest_services table (array, default to bowl)
ALTER TABLE public.phorest_services
  ADD COLUMN IF NOT EXISTS container_types public.container_type[] NOT NULL DEFAULT '{bowl}';

-- Add container_type to mix_bowls table (single value, default to bowl)
ALTER TABLE public.mix_bowls
  ADD COLUMN IF NOT EXISTS container_type public.container_type NOT NULL DEFAULT 'bowl';
