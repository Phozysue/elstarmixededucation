-- Fix profiles table RLS policies - restrict access to authenticated users
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::user_role));

-- Fix students table RLS policies - protect student PII
DROP POLICY IF EXISTS "Everyone can view students" ON public.students;

CREATE POLICY "Students view own record"
  ON public.students FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers view students in their classes"
  ON public.students FOR SELECT
  USING (
    public.has_role(auth.uid(), 'teacher'::user_role) AND
    class_id IN (
      SELECT cs.class_id 
      FROM public.class_subjects cs
      INNER JOIN public.teachers t ON cs.teacher_id = t.id
      WHERE t.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins view all students"
  ON public.students FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::user_role));

-- Fix teachers table RLS policies - protect teacher PII
DROP POLICY IF EXISTS "Everyone can view teachers" ON public.teachers;

CREATE POLICY "Teachers view own record"
  ON public.teachers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users view basic teacher info"
  ON public.teachers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins view all teachers"
  ON public.teachers FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::user_role));