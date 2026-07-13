-- Fix 1: Add CHECK constraint to validate assignment file_url 
-- Ensures URLs can only point to the assignment-files bucket in Supabase storage

-- First, add the constraint to the assignments table
ALTER TABLE public.assignments
ADD CONSTRAINT valid_assignment_file_url 
CHECK (
  file_url IS NULL OR 
  file_url LIKE 'https://kcsabjhuqwodhfqnvixs.supabase.co/storage/v1/object/public/assignment-files/%'
);

-- Also add similar constraints for gallery, hero_section, and principal_info image URLs
-- to ensure they can only point to their respective buckets

ALTER TABLE public.gallery
ADD CONSTRAINT valid_gallery_image_url 
CHECK (
  image_url LIKE 'https://kcsabjhuqwodhfqnvixs.supabase.co/storage/v1/object/public/gallery-images/%'
);

ALTER TABLE public.hero_section
ADD CONSTRAINT valid_hero_background_image 
CHECK (
  background_image IS NULL OR 
  background_image LIKE 'https://kcsabjhuqwodhfqnvixs.supabase.co/storage/v1/object/public/hero-images/%'
);

ALTER TABLE public.principal_info
ADD CONSTRAINT valid_principal_image_url 
CHECK (
  image_url IS NULL OR 
  image_url LIKE 'https://kcsabjhuqwodhfqnvixs.supabase.co/storage/v1/object/public/principal-images/%'
);