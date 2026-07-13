-- Add unique class_code to classes table (format: letters followed by digits, e.g., CLASS01)
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS class_code TEXT;

-- Add unique constraint to class_code
ALTER TABLE public.classes ADD CONSTRAINT classes_class_code_unique UNIQUE (class_code);

-- Add check constraint for class_code format (letters followed by digits)
ALTER TABLE public.classes ADD CONSTRAINT classes_class_code_format CHECK (class_code ~ '^[A-Z]+[0-9]+$');

-- Ensure student_id is unique in students table
ALTER TABLE public.students ADD CONSTRAINT students_student_id_unique UNIQUE (student_id);

-- Ensure subject code is unique
ALTER TABLE public.subjects ADD CONSTRAINT subjects_code_unique UNIQUE (code);