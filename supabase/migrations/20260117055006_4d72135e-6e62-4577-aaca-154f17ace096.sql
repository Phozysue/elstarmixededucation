-- Create storage policies for assignment-files bucket

-- Allow teachers and admins to upload assignment files
CREATE POLICY "Teachers and admins can upload assignment files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assignment-files' 
  AND (
    public.has_role(auth.uid(), 'admin'::public.user_role) 
    OR public.has_role(auth.uid(), 'teacher'::public.user_role)
  )
);

-- Allow teachers and admins to update their uploaded files
CREATE POLICY "Teachers and admins can update assignment files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'assignment-files' 
  AND (
    public.has_role(auth.uid(), 'admin'::public.user_role) 
    OR public.has_role(auth.uid(), 'teacher'::public.user_role)
  )
);

-- Allow teachers and admins to delete assignment files
CREATE POLICY "Teachers and admins can delete assignment files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'assignment-files' 
  AND (
    public.has_role(auth.uid(), 'admin'::public.user_role) 
    OR public.has_role(auth.uid(), 'teacher'::public.user_role)
  )
);

-- Allow all authenticated users (students, teachers, admins) to view/download assignment files
CREATE POLICY "Authenticated users can view assignment files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'assignment-files' 
  AND auth.uid() IS NOT NULL
);