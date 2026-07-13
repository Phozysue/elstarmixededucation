-- Add database constraints for server-side validation (INPUT_VALIDATION)
-- Using minimum of 1 character to allow existing data while preventing empty/null bypass

-- Contact submissions constraints
ALTER TABLE contact_submissions 
  ADD CONSTRAINT contact_name_length CHECK (LENGTH(name) BETWEEN 1 AND 100),
  ADD CONSTRAINT contact_email_length CHECK (LENGTH(email) <= 255),
  ADD CONSTRAINT contact_subject_length CHECK (LENGTH(subject) BETWEEN 1 AND 200),
  ADD CONSTRAINT contact_message_length CHECK (LENGTH(message) BETWEEN 1 AND 2000);

-- Admission applications constraints  
ALTER TABLE admission_applications
  ADD CONSTRAINT admission_student_name_length CHECK (LENGTH(student_name) BETWEEN 1 AND 100),
  ADD CONSTRAINT admission_parent_name_length CHECK (LENGTH(parent_name) BETWEEN 1 AND 100),
  ADD CONSTRAINT admission_parent_email_length CHECK (LENGTH(parent_email) <= 255),
  ADD CONSTRAINT admission_parent_phone_length CHECK (LENGTH(parent_phone) BETWEEN 1 AND 20),
  ADD CONSTRAINT admission_address_length CHECK (LENGTH(address) BETWEEN 1 AND 500),
  ADD CONSTRAINT admission_grade_length CHECK (LENGTH(grade_applying_for) BETWEEN 1 AND 50),
  ADD CONSTRAINT admission_previous_school_length CHECK (previous_school IS NULL OR LENGTH(previous_school) <= 200),
  ADD CONSTRAINT admission_additional_info_length CHECK (additional_info IS NULL OR LENGTH(additional_info) <= 1000);

-- Gallery constraints
ALTER TABLE gallery
  ADD CONSTRAINT gallery_title_length CHECK (LENGTH(title) BETWEEN 1 AND 200),
  ADD CONSTRAINT gallery_description_length CHECK (description IS NULL OR LENGTH(description) <= 500),
  ADD CONSTRAINT gallery_category_length CHECK (LENGTH(category) BETWEEN 1 AND 50),
  ADD CONSTRAINT gallery_display_order_range CHECK (display_order >= 0 AND display_order <= 9999);

-- Assignments constraints
ALTER TABLE assignments
  ADD CONSTRAINT assignment_title_length CHECK (LENGTH(title) BETWEEN 1 AND 200),
  ADD CONSTRAINT assignment_description_length CHECK (description IS NULL OR LENGTH(description) <= 2000),
  ADD CONSTRAINT assignment_max_marks_range CHECK (max_marks >= 1 AND max_marks <= 1000);