-- Restrict attendance marking to the assigned class teacher only
DROP POLICY IF EXISTS "Teachers manage attendance" ON public.attendance;

CREATE POLICY "Class teacher marks attendance" ON public.attendance
  FOR ALL TO authenticated
  USING (public.is_class_teacher(auth.uid(), class_id))
  WITH CHECK (public.is_class_teacher(auth.uid(), class_id));
