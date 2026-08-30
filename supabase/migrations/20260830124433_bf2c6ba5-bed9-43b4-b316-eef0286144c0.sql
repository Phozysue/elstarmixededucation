GRANT SELECT, INSERT, UPDATE, DELETE ON public.principal_info TO authenticated;
GRANT ALL ON public.principal_info TO service_role;

ALTER VIEW public.principal_info_public SET (security_invoker = off);
GRANT SELECT ON public.principal_info_public TO anon, authenticated;