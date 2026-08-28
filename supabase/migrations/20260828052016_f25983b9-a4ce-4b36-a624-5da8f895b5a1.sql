CREATE OR REPLACE FUNCTION public.enforce_single_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Allow teacher + class_teacher pairing in either direction
  IF NEW.role = 'class_teacher'
     AND 'teacher'::public.user_role = ANY(existing_roles)
     AND array_length(existing_roles, 1) = 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.role = 'teacher'
     AND 'class_teacher'::public.user_role = ANY(existing_roles)
     AND array_length(existing_roles, 1) = 1 THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Users may only have one role (admins may hold one additional role; teachers may also be class teachers)';
END;
$function$