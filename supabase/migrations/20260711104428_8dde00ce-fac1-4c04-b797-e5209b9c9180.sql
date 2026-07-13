
-- 1) Academic terms (admin-managed)
CREATE TABLE IF NOT EXISTS public.academic_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  academic_year text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(name, academic_year),
  CHECK (end_date >= start_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_terms TO authenticated;
GRANT ALL ON public.academic_terms TO service_role;

ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage terms" ON public.academic_terms
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read terms" ON public.academic_terms
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER trg_academic_terms_updated
  BEFORE UPDATE ON public.academic_terms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Link attendance & report_cards to terms (optional/backfillable)
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS term_id uuid REFERENCES public.academic_terms(id) ON DELETE SET NULL;

ALTER TABLE public.report_cards
  ADD COLUMN IF NOT EXISTS term_id uuid REFERENCES public.academic_terms(id) ON DELETE SET NULL;

-- 3) Attendance: weekdays only (Mon-Fri)
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_weekday_only;
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_weekday_only
  CHECK (EXTRACT(ISODOW FROM date) BETWEEN 1 AND 5);

-- 4) RLS: attendance managed by teachers only (admins can view but not mark)
DROP POLICY IF EXISTS "Teachers and admins can manage attendance" ON public.attendance;
DROP POLICY IF EXISTS "Students can view own attendance" ON public.attendance;

CREATE POLICY "Teachers manage attendance" ON public.attendance
  FOR ALL
  USING (public.has_role(auth.uid(), 'teacher'))
  WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Admins view attendance" ON public.attendance
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students view own attendance" ON public.attendance
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = attendance.student_id AND s.user_id = auth.uid())
  );
