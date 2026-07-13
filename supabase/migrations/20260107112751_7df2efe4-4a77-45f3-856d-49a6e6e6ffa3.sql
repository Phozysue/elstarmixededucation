-- Create storage bucket for assignment files
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignment-files', 'assignment-files', false);

-- Students can view assignment files for their class
CREATE POLICY "Students can view assignment files for their class"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'assignment-files' AND 
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'student'))
);

-- Admins and teachers can upload assignment files
CREATE POLICY "Admins and teachers can upload assignment files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assignment-files' AND 
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'))
);

-- Admins and teachers can update assignment files
CREATE POLICY "Admins and teachers can update assignment files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'assignment-files' AND 
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'))
);

-- Admins and teachers can delete assignment files
CREATE POLICY "Admins and teachers can delete assignment files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'assignment-files' AND 
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'))
);

-- Add file_url column to assignments table if not exists
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS file_url TEXT;