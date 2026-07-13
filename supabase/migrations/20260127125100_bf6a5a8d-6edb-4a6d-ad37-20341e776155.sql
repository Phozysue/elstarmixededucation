-- Add media_type column to gallery table
ALTER TABLE public.gallery
ADD COLUMN media_type text NOT NULL DEFAULT 'image';

-- Add constraint for valid media types
ALTER TABLE public.gallery
ADD CONSTRAINT valid_media_type CHECK (media_type IN ('image', 'video'));

-- Create storage bucket for gallery videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-videos', 'gallery-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to gallery videos
CREATE POLICY "Anyone can view gallery videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery-videos');

-- Allow admins to manage gallery videos
CREATE POLICY "Admins can manage gallery videos"
ON storage.objects FOR ALL
USING (
  bucket_id = 'gallery-videos' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Update the CHECK constraint for image_url to also allow videos bucket
ALTER TABLE public.gallery
DROP CONSTRAINT IF EXISTS valid_gallery_image_url;

ALTER TABLE public.gallery
ADD CONSTRAINT valid_gallery_media_url 
CHECK (
  image_url IS NULL OR 
  image_url LIKE 'https://kcsabjhuqwodhfqnvixs.supabase.co/storage/v1/object/public/gallery-images/%' OR
  image_url LIKE 'https://kcsabjhuqwodhfqnvixs.supabase.co/storage/v1/object/public/gallery-videos/%'
);