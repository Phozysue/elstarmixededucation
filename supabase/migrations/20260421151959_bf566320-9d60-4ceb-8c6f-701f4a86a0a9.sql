-- Enforce single role per user, except admins who may hold an additional role
CREATE OR REPLACE FUNCTION public.enforce_single_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_roles public.user_role[];
BEGIN
  SELECT array_agg(role) INTO existing_roles
  FROM public.user_roles
  WHERE user_id = NEW.user_id
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF existing_roles IS NULL THEN
    RETURN NEW;
  END IF;

  -- Allow admin pairing: new role is admin OR all existing roles are admin
  IF NEW.role = 'admin' THEN
    RETURN NEW;
  END IF;

  IF 'admin'::public.user_role = ANY(existing_roles)
     AND array_length(existing_roles, 1) = 1 THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Users may only have one role (admins may hold one additional role)';
END;
$$;

DROP TRIGGER IF EXISTS enforce_single_role_trigger ON public.user_roles;
CREATE TRIGGER enforce_single_role_trigger
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_role();