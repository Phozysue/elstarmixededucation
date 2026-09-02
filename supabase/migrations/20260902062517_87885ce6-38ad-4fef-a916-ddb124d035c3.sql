ALTER TABLE public.contact_submissions DROP CONSTRAINT contact_submissions_status_check;
ALTER TABLE public.contact_submissions ADD CONSTRAINT contact_submissions_status_check CHECK (status = ANY (ARRAY['pending','reviewed','responded','read']));
ALTER TABLE public.contact_submissions ADD COLUMN phone text;
ALTER TABLE public.contact_submissions ADD CONSTRAINT contact_phone_length CHECK (phone IS NULL OR length(phone) BETWEEN 7 AND 20);