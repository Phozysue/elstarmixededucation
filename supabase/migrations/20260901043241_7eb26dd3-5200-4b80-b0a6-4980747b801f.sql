ALTER TABLE public.hero_section DROP CONSTRAINT IF EXISTS valid_hero_background_image;
ALTER TABLE public.hero_section ADD CONSTRAINT valid_hero_background_image CHECK (
  background_image IS NULL
  OR background_image = ''
  OR background_image LIKE '%/storage/v1/object/public/hero-images/%'
);