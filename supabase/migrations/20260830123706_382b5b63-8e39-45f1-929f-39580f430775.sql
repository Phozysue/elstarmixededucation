DROP VIEW IF EXISTS public.teachers_directory;

CREATE TABLE IF NOT EXISTS public.teacher_directory (
  teacher_id uuid PRIMARY KEY REFERENCES public.teachers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  staff_no text NOT NULL,
  qualification text,
  specialization text,
  join_date date
);

GRANT SELECT ON public.teacher_directory TO anon, authenticated;
GRANT ALL ON public.teacher_directory TO service_role;

ALTER TABLE public.teacher_directory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view the staff directory" ON public.teacher_directory;
CREATE POLICY "Anyone can view the staff directory"
ON public.teacher_directory FOR SELECT
USING (true);

CREATE OR REPLACE FUNCTION public.sync_teacher_directory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.teacher_directory WHERE teacher_id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.teacher_directory (teacher_id, user_id, staff_no, qualification, specialization, join_date)
  VALUES (NEW.id, NEW.user_id, NEW.teacher_id, NEW.qualification, NEW.specialization, NEW.join_date)
  ON CONFLICT (teacher_id) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        staff_no = EXCLUDED.staff_no,
        qualification = EXCLUDED.qualification,
        specialization = EXCLUDED.specialization,
        join_date = EXCLUDED.join_date;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_teacher_directory() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_teacher_directory ON public.teachers;
CREATE TRIGGER trg_sync_teacher_directory
AFTER INSERT OR UPDATE OR DELETE ON public.teachers
FOR EACH ROW EXECUTE FUNCTION public.sync_teacher_directory();

INSERT INTO public.teacher_directory (teacher_id, user_id, staff_no, qualification, specialization, join_date)
SELECT t.id, t.user_id, t.teacher_id, t.qualification, t.specialization, t.join_date
FROM public.teachers t
ON CONFLICT (teacher_id) DO NOTHING;