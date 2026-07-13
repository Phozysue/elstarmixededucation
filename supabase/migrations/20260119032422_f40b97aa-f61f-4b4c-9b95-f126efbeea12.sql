-- Create storage bucket for hero section images
INSERT INTO storage.buckets (id, name, public)
VALUES ('hero-images', 'hero-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload/update/delete hero images
CREATE POLICY "Admins can manage hero images"
ON storage.objects FOR ALL
USING (
  bucket_id = 'hero-images' 
  AND public.has_role(auth.uid(), 'admin'::public.user_role)
)
WITH CHECK (
  bucket_id = 'hero-images' 
  AND public.has_role(auth.uid(), 'admin'::public.user_role)
);

-- Allow everyone to view hero images (public bucket)
CREATE POLICY "Anyone can view hero images"
ON storage.objects FOR SELECT
USING (bucket_id = 'hero-images');