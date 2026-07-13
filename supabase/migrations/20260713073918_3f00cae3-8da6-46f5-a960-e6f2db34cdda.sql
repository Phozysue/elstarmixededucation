
-- Add new roles to enum (must be committed before policy usage)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'parent';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'principal';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'bursar';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'class_teacher';

-- Parent ↔ Student link table
CREATE TABLE IF NOT EXISTS public.parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_user_id, student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_students TO authenticated;
GRANT ALL ON public.parent_students TO service_role;

ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage parent links"
  ON public.parent_students FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Parents view own links"
  ON public.parent_students FOR SELECT
  USING (parent_user_id = auth.uid());
