
-- Helper: is this user the parent of this student?
CREATE OR REPLACE FUNCTION public.is_parent_of(_user_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_students
    WHERE parent_user_id = _user_id AND student_id = _student_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_parent_of(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_parent_of(uuid, uuid) TO authenticated, service_role;

-- STUDENTS: parents/principals view
CREATE POLICY "Parents view linked students"
  ON public.students FOR SELECT
  USING (public.is_parent_of(auth.uid(), id));

CREATE POLICY "Principals view all students"
  ON public.students FOR SELECT
  USING (public.has_role(auth.uid(), 'principal'));

-- EXAM RESULTS: parents view their kid; principals view all; bursars none
CREATE POLICY "Parents view children results"
  ON public.exam_results FOR SELECT
  USING (public.is_parent_of(auth.uid(), student_id));

CREATE POLICY "Principals view all results"
  ON public.exam_results FOR SELECT
  USING (public.has_role(auth.uid(), 'principal'));

-- REPORT CARDS
CREATE POLICY "Parents view children report cards"
  ON public.report_cards FOR SELECT
  USING (public.is_parent_of(auth.uid(), student_id));

CREATE POLICY "Principals view all report cards"
  ON public.report_cards FOR SELECT
  USING (public.has_role(auth.uid(), 'principal'));

-- STUDENT FEES
CREATE POLICY "Parents view children fees"
  ON public.student_fees FOR SELECT
  USING (public.is_parent_of(auth.uid(), student_id));

CREATE POLICY "Bursars manage fees"
  ON public.student_fees FOR ALL
  USING (public.has_role(auth.uid(), 'bursar'))
  WITH CHECK (public.has_role(auth.uid(), 'bursar'));

CREATE POLICY "Principals view fees"
  ON public.student_fees FOR SELECT
  USING (public.has_role(auth.uid(), 'principal'));

-- FEE PAYMENTS
CREATE POLICY "Parents view children payments"
  ON public.fee_payments FOR SELECT
  USING (public.is_parent_of(auth.uid(), student_id));

CREATE POLICY "Bursars manage payments"
  ON public.fee_payments FOR ALL
  USING (public.has_role(auth.uid(), 'bursar'))
  WITH CHECK (public.has_role(auth.uid(), 'bursar'));

CREATE POLICY "Principals view payments"
  ON public.fee_payments FOR SELECT
  USING (public.has_role(auth.uid(), 'principal'));

-- ATTENDANCE
CREATE POLICY "Parents view children attendance"
  ON public.attendance FOR SELECT
  USING (public.is_parent_of(auth.uid(), student_id));

CREATE POLICY "Principals view all attendance"
  ON public.attendance FOR SELECT
  USING (public.has_role(auth.uid(), 'principal'));

-- ANNOUNCEMENTS: principals can also manage
CREATE POLICY "Principals manage announcements"
  ON public.announcements FOR ALL
  USING (public.has_role(auth.uid(), 'principal'))
  WITH CHECK (public.has_role(auth.uid(), 'principal'));

-- PROFILES: parents and principals view profiles of their scope (broad read for linked-user lookups)
CREATE POLICY "Principals view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'principal'));

-- EXAMS: principals manage (approve/publish later)
CREATE POLICY "Principals manage exams"
  ON public.exams FOR ALL
  USING (public.has_role(auth.uid(), 'principal'))
  WITH CHECK (public.has_role(auth.uid(), 'principal'));
