-- Create hero_images table for multiple banner images
CREATE TABLE public.hero_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id)
);

-- Add constraint to ensure image URLs point to the hero-images bucket
ALTER TABLE public.hero_images
ADD CONSTRAINT valid_hero_images_url 
CHECK (
  image_url LIKE 'https://kcsabjhuqwodhfqnvixs.supabase.co/storage/v1/object/public/hero-images/%'
);

-- Enable RLS
ALTER TABLE public.hero_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view active hero images
CREATE POLICY "Anyone can view active hero images" 
ON public.hero_images 
FOR SELECT 
USING (is_active = true);

-- Admins can manage all hero images
CREATE POLICY "Admins can manage hero images" 
ON public.hero_images 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create index for ordering
CREATE INDEX idx_hero_images_order ON public.hero_images(display_order);

-- Add trigger for updated_at
CREATE TRIGGER update_hero_images_updated_at
BEFORE UPDATE ON public.hero_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();