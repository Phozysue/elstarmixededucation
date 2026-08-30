-- 1. Students: remove blanket teacher access
DROP POLICY IF EXISTS "Teachers can view all students" ON public.students;

-- 2. Teachers table: remove blanket authenticated access to sensitive personal details
DROP POLICY IF EXISTS "Authenticated users view basic teacher info" ON public.teachers;

CREATE POLICY "Principals view all teachers"
ON public.teachers FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'principal'::public.user_role));

-- Safe directory view exposing only non-sensitive teacher fields
CREATE OR REPLACE VIEW public.teachers_directory
WITH (security_invoker = false) AS
SELECT t.id, t.user_id, t.teacher_id, t.qualification, t.specialization, t.join_date
FROM public.teachers t;

GRANT SELECT ON public.teachers_directory TO anon, authenticated;

-- 3. Lock down SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.enforce_single_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_locked_results() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lock_results_on_publish() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_audit_log_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_student_fees_paid() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.user_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_class_teacher(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_subject_teacher(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_parent_of(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_class_teacher(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_subject_teacher(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_parent_of(uuid, uuid) TO authenticated;