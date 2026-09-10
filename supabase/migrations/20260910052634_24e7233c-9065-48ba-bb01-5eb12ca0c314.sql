GRANT SELECT ON public.academic_terms TO anon;
CREATE POLICY "Public can view term schedule"
ON public.academic_terms
FOR SELECT
TO anon
USING (true);