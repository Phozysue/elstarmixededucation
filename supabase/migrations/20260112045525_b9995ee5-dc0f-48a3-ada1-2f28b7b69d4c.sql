-- Enable realtime for user_roles table so changes are reflected immediately
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;