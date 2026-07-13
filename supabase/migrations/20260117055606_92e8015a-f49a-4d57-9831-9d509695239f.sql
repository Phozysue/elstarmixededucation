-- Create principal_info table to store principal details
CREATE TABLE public.principal_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Principal',
  image_url TEXT,
  message TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  updated_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.principal_info ENABLE ROW LEVEL SECURITY;

-- Everyone can view principal info
CREATE POLICY "Everyone can view principal info"
ON public.principal_info FOR SELECT
USING (true);

-- Only admins can manage principal info
CREATE POLICY "Admins can manage principal info"
ON public.principal_info FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.user_role));

-- Create trigger for updated_at
CREATE TRIGGER update_principal_info_updated_at
BEFORE UPDATE ON public.principal_info
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for principal images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('principal-images', 'principal-images', true);

-- Storage policies for principal images
CREATE POLICY "Anyone can view principal images"
ON storage.objects FOR SELECT
USING (bucket_id = 'principal-images');

CREATE POLICY "Admins can upload principal images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'principal-images' 
  AND public.has_role(auth.uid(), 'admin'::public.user_role)
);

CREATE POLICY "Admins can update principal images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'principal-images' 
  AND public.has_role(auth.uid(), 'admin'::public.user_role)
);

CREATE POLICY "Admins can delete principal images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'principal-images' 
  AND public.has_role(auth.uid(), 'admin'::public.user_role)
);

-- Insert default principal info
INSERT INTO public.principal_info (name, title, message, updated_by)
VALUES (
  'Mr. Joel Onyango',
  'Director, Elstar Mixed Education Centre',
  'Dear Students, Parents, and Community Members,

It is with great pride and enthusiasm that I welcome you to Excellence Academy. Our school has been a cornerstone of educational excellence in our community for over two decades, and we continue to evolve and adapt to meet the needs of our students in the 21st century.

We understand that education is not just about passing examinations, but about preparing young people for life. That''s why we emphasize values such as integrity, respect, and responsibility alongside academic achievement.

I invite you to join our community and experience the Elstar Mix Secondary School difference. Together, we can help your child reach their full potential.',
  '00000000-0000-0000-0000-000000000000'
);