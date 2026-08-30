ALTER TABLE public.hero_images DROP CONSTRAINT IF EXISTS valid_hero_images_url;
ALTER TABLE public.hero_images ADD CONSTRAINT valid_hero_images_url
  CHECK (image_url LIKE '%/storage/v1/object/public/hero-images/%');

ALTER TABLE public.gallery DROP CONSTRAINT IF EXISTS valid_gallery_media_url;
ALTER TABLE public.gallery ADD CONSTRAINT valid_gallery_media_url
  CHECK (
    image_url IS NULL
    OR image_url LIKE '%/storage/v1/object/public/gallery-images/%'
    OR image_url LIKE '%/storage/v1/object/public/gallery-videos/%'
  );

ALTER TABLE public.principal_info DROP CONSTRAINT IF EXISTS valid_principal_image_url;
ALTER TABLE public.principal_info ADD CONSTRAINT valid_principal_image_url
  CHECK (
    image_url IS NULL
    OR image_url LIKE '%/storage/v1/object/public/principal-images/%'
  );