
-- Drop the public SELECT policy for library_books
DROP POLICY IF EXISTS "Everyone can view library books" ON public.library_books;

-- Create a new policy that only allows SELECT for admin, teacher, or student roles
CREATE POLICY "Authenticated roles can view library books"
ON public.library_books
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::user_role)
  OR has_role(auth.uid(), 'teacher'::user_role)
  OR has_role(auth.uid(), 'student'::user_role)
);
