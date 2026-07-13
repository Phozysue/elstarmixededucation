-- 1. Prevent duplicate submissions
ALTER TABLE public.assignment_submissions
ADD CONSTRAINT assignment_submissions_unique_per_student
UNIQUE (assignment_id, student_id);

-- 2. Replace broad student SELECT with folder-scoped one
DROP POLICY IF EXISTS "Students can view assignment files for their class" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view assignment files" ON storage.objects;

-- Teachers and admins keep full read access
CREATE POLICY "Teachers and admins can view all assignment files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'assignment-files'
  AND (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'teacher'::user_role))
);

-- Students can read teacher-uploaded assignment briefs (files NOT under a student folder)
-- AND their own submission folder
CREATE POLICY "Students can view own submission files and assignment briefs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'assignment-files'
  AND has_role(auth.uid(), 'student'::user_role)
  AND (
    -- Own submissions: first folder segment matches their student id
    (storage.foldername(name))[1] IN (
      SELECT s.id::text FROM public.students s WHERE s.user_id = auth.uid()
    )
    -- OR teacher-uploaded files (path doesn't start with any student id)
    OR NOT EXISTS (
      SELECT 1 FROM public.students s2
      WHERE s2.id::text = (storage.foldername(name))[1]
    )
  )
);