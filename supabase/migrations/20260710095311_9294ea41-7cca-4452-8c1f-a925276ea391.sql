
-- Helper functions
CREATE OR REPLACE FUNCTION public.is_class_teacher(_user_id uuid, _class_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes c
    JOIN public.teachers t ON t.id = c.class_teacher_id
    WHERE c.id = _class_id AND t.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_subject_teacher(_user_id uuid, _class_id uuid, _subject_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_subjects cs
    JOIN public.teachers t ON t.id = cs.teacher_id
    WHERE cs.class_id = _class_id AND cs.subject_id = _subject_id AND t.user_id = _user_id
  );
$$;

-- Tighten exam_results RLS: subject teacher only for their (class, subject)
DROP POLICY IF EXISTS "Teachers and admins can manage results" ON public.exam_results;

CREATE POLICY "Admins manage all results" ON public.exam_results
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Subject teachers manage their results" ON public.exam_results
FOR ALL TO authenticated
USING (
  public.is_subject_teacher(
    auth.uid(),
    (SELECT class_id FROM public.exams WHERE id = exam_results.exam_id),
    exam_results.subject_id
  )
)
WITH CHECK (
  public.is_subject_teacher(
    auth.uid(),
    (SELECT class_id FROM public.exams WHERE id = exam_results.exam_id),
    exam_results.subject_id
  )
);

-- FEES
CREATE TABLE public.student_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  total_due numeric(10,2) NOT NULL DEFAULT 0,
  total_paid numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_fees TO authenticated;
GRANT ALL ON public.student_fees TO service_role;
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage fees" ON public.student_fees FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Students view own fees" ON public.student_fees FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_fees.student_id AND s.user_id = auth.uid()));

CREATE TRIGGER trg_student_fees_updated BEFORE UPDATE ON public.student_fees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  method text,
  reference text,
  note text,
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_payments TO authenticated;
GRANT ALL ON public.fee_payments TO service_role;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payments" ON public.fee_payments FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Students view own payments" ON public.fee_payments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = fee_payments.student_id AND s.user_id = auth.uid()));

-- Keep student_fees.total_paid in sync
CREATE OR REPLACE FUNCTION public.sync_student_fees_paid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sid uuid;
  total numeric(10,2);
BEGIN
  sid := COALESCE(NEW.student_id, OLD.student_id);
  SELECT COALESCE(SUM(amount),0) INTO total FROM public.fee_payments WHERE student_id = sid;
  UPDATE public.student_fees SET total_paid = total, updated_at = now() WHERE student_id = sid;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_fee_payments_sync
AFTER INSERT OR UPDATE OR DELETE ON public.fee_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_student_fees_paid();

-- REPORT CARDS
CREATE TABLE public.report_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  term text NOT NULL,
  academic_year text NOT NULL,
  pdf_path text,
  remarks text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, term, academic_year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_cards TO authenticated;
GRANT ALL ON public.report_cards TO service_role;
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage report cards" ON public.report_cards FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Class teacher manages their class report cards" ON public.report_cards FOR ALL TO authenticated
USING (public.is_class_teacher(auth.uid(), class_id))
WITH CHECK (public.is_class_teacher(auth.uid(), class_id));

CREATE POLICY "Students view own report cards" ON public.report_cards FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = report_cards.student_id AND s.user_id = auth.uid()));

CREATE TRIGGER trg_report_cards_updated BEFORE UPDATE ON public.report_cards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage RLS for report-cards bucket
-- Path convention: <class_id>/<student_id>/<filename>
CREATE POLICY "Admins full access report-cards" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'report-cards' AND public.has_role(auth.uid(),'admin'))
WITH CHECK (bucket_id = 'report-cards' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Class teacher manages report-cards for their class" ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'report-cards'
  AND public.is_class_teacher(auth.uid(), ((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'report-cards'
  AND public.is_class_teacher(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Students read own report cards from storage" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'report-cards'
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.user_id = auth.uid()
      AND s.id::text = (storage.foldername(name))[2]
  )
);
