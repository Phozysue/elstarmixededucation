DROP POLICY IF EXISTS "Everyone can view active important dates" ON public.important_dates;

CREATE POLICY "Public can view active important dates"
ON public.important_dates
FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Admins can view all important dates"
ON public.important_dates
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role));