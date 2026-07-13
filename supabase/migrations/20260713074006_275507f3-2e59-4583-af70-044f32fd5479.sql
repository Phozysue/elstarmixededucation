
-- Exam status enum
DO $$ BEGIN
  CREATE TYPE public.exam_status AS ENUM ('draft','submitted','approved','published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS status public.exam_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

ALTER TABLE public.exam_results
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;

-- Lock results when exam is published
CREATE OR REPLACE FUNCTION public.lock_results_on_publish()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published') THEN
    UPDATE public.exam_results SET locked = true WHERE exam_id = NEW.id;
    NEW.published_at := now();
  END IF;
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    NEW.approved_at := now();
    NEW.approved_by := auth.uid();
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_lock_results_on_publish ON public.exams;
CREATE TRIGGER trg_lock_results_on_publish
  BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.lock_results_on_publish();

-- Prevent teacher edits once locked (admin can still override)
CREATE OR REPLACE FUNCTION public.guard_locked_results()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.locked = true
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Result is locked (exam published)';
  END IF;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_locked_results ON public.exam_results;
CREATE TRIGGER trg_guard_locked_results
  BEFORE UPDATE OR DELETE ON public.exam_results
  FOR EACH ROW EXECUTE FUNCTION public.guard_locked_results();

-- Replace the "Students can view own results" policy to require published
DROP POLICY IF EXISTS "Students can view own results" ON public.exam_results;

CREATE POLICY "Students view published own results"
  ON public.exam_results FOR SELECT
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'teacher')
    OR public.has_role(auth.uid(),'principal')
    OR (
      EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_results.exam_id AND e.status = 'published')
      AND (
        EXISTS (SELECT 1 FROM public.students s WHERE s.id = exam_results.student_id AND s.user_id = auth.uid())
        OR public.is_parent_of(auth.uid(), student_id)
      )
    )
  );

-- Drop the older parent policy from previous migration (superseded)
DROP POLICY IF EXISTS "Parents view children results" ON public.exam_results;
