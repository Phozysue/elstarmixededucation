-- Create hero_section table for admin-managed homepage content
CREATE TABLE public.hero_section (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  subtitle text,
  button_text text NOT NULL DEFAULT 'Apply Now',
  button_link text NOT NULL DEFAULT '/admissions/apply',
  background_image text,
  updated_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hero_section ENABLE ROW LEVEL SECURITY;

-- Everyone can view hero section
CREATE POLICY "Everyone can view hero section"
ON public.hero_section
FOR SELECT
USING (true);

-- Only admins can manage hero section
CREATE POLICY "Admins can manage hero section"
ON public.hero_section
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

-- Add trigger for updated_at
CREATE TRIGGER update_hero_section_updated_at
BEFORE UPDATE ON public.hero_section
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default hero section
INSERT INTO public.hero_section (title, subtitle, button_text, button_link, background_image, updated_by)
SELECT 
  'Welcome to Our School',
  'In Pursuit of Excellence',
  'Apply Now',
  '/admissions/apply',
  '/hero-school.jpg',
  (SELECT id FROM auth.users LIMIT 1)
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1);

-- Update RLS policies for teacher access to relevant tables
CREATE POLICY "Teachers can view all students"
ON public.students
FOR SELECT
USING (has_role(auth.uid(), 'teacher'::user_role));

CREATE POLICY "Teachers can manage assignments"
ON public.assignments
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'teacher'::user_role));

CREATE POLICY "Teachers can view all classes"
ON public.classes
FOR SELECT
USING (has_role(auth.uid(), 'teacher'::user_role));

-- Update RLS policies for student access
CREATE POLICY "Students can view own assignments"
ON public.assignments
FOR SELECT
USING (
  has_role(auth.uid(), 'student'::user_role) AND
  class_subject_id IN (
    SELECT cs.id FROM class_subjects cs
    JOIN students s ON s.class_id = cs.class_id
    WHERE s.user_id = auth.uid()
  )
);