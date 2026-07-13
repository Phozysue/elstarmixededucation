-- Create gallery table for school images
CREATE TABLE public.gallery (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  is_featured boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

-- Admins can manage gallery
CREATE POLICY "Admins can manage gallery"
  ON public.gallery FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Everyone can view gallery
CREATE POLICY "Everyone can view gallery"
  ON public.gallery FOR SELECT
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_gallery_updated_at
  BEFORE UPDATE ON public.gallery
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.gallery;