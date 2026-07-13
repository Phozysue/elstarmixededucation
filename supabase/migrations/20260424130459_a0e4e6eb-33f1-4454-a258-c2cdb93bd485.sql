-- 1. Make library-pdfs bucket PRIVATE
UPDATE storage.buckets SET public = false WHERE id = 'library-pdfs';

-- 2. Storage policies for library-pdfs (replace any existing ones)
DROP POLICY IF EXISTS "Public can read library pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read library pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage library pdfs" ON storage.objects;

CREATE POLICY "Authenticated roles can read library pdfs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'library-pdfs'
  AND (
    has_role(auth.uid(), 'admin'::user_role)
    OR has_role(auth.uid(), 'teacher'::user_role)
    OR has_role(auth.uid(), 'student'::user_role)
  )
);

CREATE POLICY "Admins can manage library pdfs"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'library-pdfs' AND has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (bucket_id = 'library-pdfs' AND has_role(auth.uid(), 'admin'::user_role));

-- 3. Restrict principal_info: hide contact fields from public
DROP POLICY IF EXISTS "Everyone can view principal info" ON public.principal_info;

-- Public-safe view (no phone/email)
CREATE OR REPLACE VIEW public.principal_info_public
WITH (security_invoker = on) AS
SELECT id, name, title, image_url, message, created_at, updated_at
FROM public.principal_info;

GRANT SELECT ON public.principal_info_public TO anon, authenticated;

-- Only admins can read the full table (with phone/email)
CREATE POLICY "Admins can view full principal info"
ON public.principal_info FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));