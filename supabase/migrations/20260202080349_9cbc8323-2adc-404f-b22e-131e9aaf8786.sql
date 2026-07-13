-- Create library_books table
CREATE TABLE public.library_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  cover_image_url TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  available_quantity INTEGER NOT NULL DEFAULT 1,
  published_year INTEGER,
  publisher TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT quantity_positive CHECK (quantity >= 0),
  CONSTRAINT available_quantity_valid CHECK (available_quantity >= 0 AND available_quantity <= quantity)
);

-- Enable RLS
ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view library books"
  ON public.library_books
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage library books"
  ON public.library_books
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Create storage bucket for book covers
INSERT INTO storage.buckets (id, name, public) VALUES ('book-covers', 'book-covers', true);

-- Storage policies for book covers
CREATE POLICY "Anyone can view book covers"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'book-covers');

CREATE POLICY "Admins can upload book covers"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'book-covers' AND has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update book covers"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'book-covers' AND has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete book covers"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'book-covers' AND has_role(auth.uid(), 'admin'::user_role));

-- Enable realtime for library_books
ALTER PUBLICATION supabase_realtime ADD TABLE public.library_books;