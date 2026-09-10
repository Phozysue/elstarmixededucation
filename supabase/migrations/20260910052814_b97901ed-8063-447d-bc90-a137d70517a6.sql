DROP POLICY IF EXISTS "Admins can manage important dates" ON public.important_dates;

CREATE POLICY "Admins can manage important dates"
ON public.important_dates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));