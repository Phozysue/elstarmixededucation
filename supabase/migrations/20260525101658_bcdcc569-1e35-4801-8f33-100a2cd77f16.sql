CREATE POLICY "Admins can update contact submissions"
ON public.contact_submissions FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete contact submissions"
ON public.contact_submissions FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::user_role));