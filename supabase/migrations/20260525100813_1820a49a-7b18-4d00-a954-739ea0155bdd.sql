
-- 1. Remove permissive WITH CHECK (true) INSERT policies; edge functions use service role
DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;
DROP POLICY IF EXISTS "Anyone can submit admission application" ON public.admission_applications;

-- 2. Remove broad listing/read policies on storage.objects for buckets
-- Public buckets: direct getPublicUrl still works without storage.objects SELECT policy
DROP POLICY IF EXISTS "Anyone can view gallery videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view hero images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view principal images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view teacher photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view book covers" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view gallery images" ON storage.objects;

-- Private bucket: library PDFs must only be accessed via signed URLs
DROP POLICY IF EXISTS "Anyone can view library PDFs" ON storage.objects;

-- 3. Fix search_path on update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;
