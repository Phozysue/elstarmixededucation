-- Drop all existing policies on profiles, students, and teachers tables
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on profiles
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.profiles';
    END LOOP;
    
    -- Drop all policies on students
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'students' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.students';
    END LOOP;
    
    -- Drop all policies on teachers
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'teachers' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.teachers';
    END LOOP;
END $$;

-- Recreate secure RLS policies for profiles table
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::user_role));

-- Recreate secure RLS policies for students table
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

-- Keep existing admin management for students
CREATE POLICY "Admins can manage students"
  ON public.students FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Students can update own record"
  ON public.students FOR UPDATE
  USING (auth.uid() = user_id);

-- Recreate secure RLS policies for teachers table
CREATE POLICY "Teachers view own record"
  ON public.teachers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users view basic teacher info"
  ON public.teachers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins view all teachers"
  ON public.teachers FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::user_role));

-- Keep existing admin management for teachers
CREATE POLICY "Admins can manage teachers"
  ON public.teachers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Teachers can update own record"
  ON public.teachers FOR UPDATE
  USING (auth.uid() = user_id);