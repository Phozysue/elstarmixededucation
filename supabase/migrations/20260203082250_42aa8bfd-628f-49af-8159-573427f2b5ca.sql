-- Add pdf_url column to library_books table
ALTER TABLE public.library_books ADD COLUMN pdf_url text;

-- Create storage bucket for library PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('library-pdfs', 'library-pdfs', true);

-- Create storage policies for library-pdfs bucket
CREATE POLICY "Anyone can view library PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'library-pdfs');

CREATE POLICY "Admins can upload library PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'library-pdfs' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update library PDFs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'library-pdfs' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete library PDFs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'library-pdfs' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);