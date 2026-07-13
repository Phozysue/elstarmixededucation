-- Drop the existing broad FOR ALL policy
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Create separate, explicit policies with proper WITH CHECK clauses

-- SELECT: Users can view their own roles (already exists, keeping it)
-- DROP and recreate to ensure it's correct
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- SELECT: Admins can view all roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- INSERT: Only admins can insert new roles (with explicit WITH CHECK)
CREATE POLICY "Admins can insert roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- UPDATE: Only admins can update roles (with both USING and WITH CHECK)
CREATE POLICY "Admins can update roles"
  ON public.user_roles
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- DELETE: Only admins can delete roles
CREATE POLICY "Admins can delete roles"
  ON public.user_roles
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::user_role));