CREATE POLICY "Class teachers view their students"
ON public.students
FOR SELECT
TO authenticated
USING (public.is_class_teacher(auth.uid(), class_id));

CREATE POLICY "Teachers view names of students in their classes"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'teacher'::public.user_role)
  AND EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.classes c ON c.id = s.class_id
    WHERE s.user_id = profiles.id
      AND (
        public.is_class_teacher(auth.uid(), s.class_id)
        OR EXISTS (
          SELECT 1
          FROM public.class_subjects cs
          JOIN public.teachers t ON t.id = cs.teacher_id
          WHERE cs.class_id = s.class_id
            AND t.user_id = auth.uid()
        )
      )
  )
);