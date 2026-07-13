-- Allow students to upload their own assignment submissions
-- Files are stored at path: <student_id>/<assignment_id>/<filename>
CREATE POLICY "Students can upload own submission files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'assignment-files'
  AND has_role(auth.uid(), 'student'::user_role)
  AND (storage.foldername(name))[1] IN (
    SELECT s.id::text FROM public.students s WHERE s.user_id = auth.uid()
  )
);

CREATE POLICY "Students can update own submission files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'assignment-files'
  AND has_role(auth.uid(), 'student'::user_role)
  AND (storage.foldername(name))[1] IN (
    SELECT s.id::text FROM public.students s WHERE s.user_id = auth.uid()
  )
);