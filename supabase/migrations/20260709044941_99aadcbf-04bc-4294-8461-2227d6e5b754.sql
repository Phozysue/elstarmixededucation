ALTER TABLE public.assignments
DROP CONSTRAINT IF EXISTS valid_assignment_file_url;

UPDATE public.assignments
SET file_url = substring(file_url from '/storage/v1/object/public/assignment-files/(.*)$')
WHERE file_url LIKE '%/storage/v1/object/public/assignment-files/%';

ALTER TABLE public.assignments
ADD CONSTRAINT valid_assignment_file_url
CHECK (
  file_url IS NULL
  OR file_url !~ '^[a-zA-Z][a-zA-Z0-9+.-]*://'
  OR file_url LIKE '%/storage/v1/object/public/assignment-files/%'
  OR file_url LIKE '%/storage/v1/object/sign/assignment-files/%'
);