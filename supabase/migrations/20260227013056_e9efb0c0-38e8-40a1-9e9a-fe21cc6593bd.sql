
-- Add category column to specialty_options
ALTER TABLE public.specialty_options ADD COLUMN category TEXT NOT NULL DEFAULT 'Premium / Transformation';

-- Delete existing specialty options
DELETE FROM public.specialty_options;

-- Insert new Premium / Transformation specialties
INSERT INTO public.specialty_options (name, display_order, is_active, category) VALUES
  ('Luxury Transformations', 1, true, 'Premium / Transformation'),
  ('High-Impact Color', 2, true, 'Premium / Transformation'),
  ('Dimensional Color', 3, true, 'Premium / Transformation'),
  ('Custom Color', 4, true, 'Premium / Transformation'),
  ('Color Specialist', 5, true, 'Premium / Transformation'),
  ('Extension Specialist', 6, true, 'Premium / Transformation'),
  ('Transformation Specialist', 7, true, 'Premium / Transformation'),
  ('Bridal Specialist', 8, true, 'Premium / Transformation'),
  ('Blonde Specialist', 9, true, 'Premium / Transformation'),
  ('Brunette Specialist', 10, true, 'Premium / Transformation');

-- Insert Texture & Treatment specialties
INSERT INTO public.specialty_options (name, display_order, is_active, category) VALUES
  ('Smoothing Treatments', 11, true, 'Texture & Treatment'),
  ('Keratin', 12, true, 'Texture & Treatment'),
  ('Perms', 13, true, 'Texture & Treatment'),
  ('Scalp Health', 14, true, 'Texture & Treatment'),
  ('Hair Repair', 15, true, 'Texture & Treatment'),
  ('Damage Correction', 16, true, 'Texture & Treatment');
