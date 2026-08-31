DROP POLICY IF EXISTS "Authenticated roles can view library books" ON public.library_books;
CREATE POLICY "Authenticated roles can view library books"
ON public.library_books FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'teacher')
  OR public.has_role(auth.uid(), 'class_teacher')
  OR public.has_role(auth.uid(), 'principal')
  OR public.has_role(auth.uid(), 'student')
);

DROP POLICY IF EXISTS "Authenticated roles can read library pdfs" ON storage.objects;
CREATE POLICY "Authenticated roles can read library pdfs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'library-pdfs' AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'class_teacher')
    OR public.has_role(auth.uid(), 'principal')
    OR public.has_role(auth.uid(), 'student')
  )
);