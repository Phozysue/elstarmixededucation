DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_student_date_class_unique'
  ) THEN
    ALTER TABLE public.attendance
      ADD CONSTRAINT attendance_student_date_class_unique UNIQUE (student_id, date, class_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON public.attendance(class_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance(student_id, date);