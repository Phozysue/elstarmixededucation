-- Create storage bucket for teacher profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('teacher-photos', 'teacher-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload/update/delete teacher photos
CREATE POLICY "Admins can manage teacher photos"
ON storage.objects FOR ALL
USING (
  bucket_id = 'teacher-photos' 
  AND public.has_role(auth.uid(), 'admin'::public.user_role)
)
WITH CHECK (
  bucket_id = 'teacher-photos' 
  AND public.has_role(auth.uid(), 'admin'::public.user_role)
);

-- Allow everyone to view teacher photos (public bucket)
CREATE POLICY "Anyone can view teacher photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'teacher-photos');

-- Add RLS policy to allow admins to update profile avatar_url
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));