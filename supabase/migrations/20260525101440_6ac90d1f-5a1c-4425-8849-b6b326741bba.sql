CREATE TABLE public.important_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  deadline_text text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.important_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active important dates"
ON public.important_dates FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can manage important dates"
ON public.important_dates FOR ALL
USING (public.has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

CREATE TRIGGER update_important_dates_updated_at
BEFORE UPDATE ON public.important_dates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.important_dates (label, deadline_text, display_order, created_by)
SELECT 'Early Admission', 'Deadline: December 31', 1, ur.user_id FROM public.user_roles ur WHERE ur.role='admin'::user_role LIMIT 1;
INSERT INTO public.important_dates (label, deadline_text, display_order, created_by)
SELECT 'Regular Admission', 'Deadline: March 15', 2, ur.user_id FROM public.user_roles ur WHERE ur.role='admin'::user_role LIMIT 1;
INSERT INTO public.important_dates (label, deadline_text, display_order, created_by)
SELECT 'Rolling Admission', 'Applications accepted year-round (subject to availability)', 3, ur.user_id FROM public.user_roles ur WHERE ur.role='admin'::user_role LIMIT 1;