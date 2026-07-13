import { z } from "zod";

// Contact Form Validation
export const contactSchema = z.object({
  name: z.string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Name contains invalid characters"),
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  subject: z.string()
    .trim()
    .min(3, "Subject must be at least 3 characters")
    .max(200, "Subject must be less than 200 characters"),
  message: z.string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must be less than 2000 characters")
});

export type ContactFormData = z.infer<typeof contactSchema>;

// Admissions Form Validation
export const admissionsSchema = z.object({
  studentName: z.string()
    .trim()
    .min(2, "Student name must be at least 2 characters")
    .max(100, "Student name must be less than 100 characters"),
  dateOfBirth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 3 && age <= 25;
    }, "Student age must be between 3 and 25 years"),
  gender: z.enum(["male", "female", "other"], {
    errorMap: () => ({ message: "Please select a valid gender" })
  }),
  parentName: z.string()
    .trim()
    .min(2, "Parent name must be at least 2 characters")
    .max(100, "Parent name must be less than 100 characters"),
  parentEmail: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  parentPhone: z.string()
    .trim()
    .min(7, "Phone number must be at least 7 characters")
    .max(20, "Phone number must be less than 20 characters")
    .regex(/^[\d\s\-+()]+$/, "Invalid phone number format"),
  address: z.string()
    .trim()
    .min(10, "Address must be at least 10 characters")
    .max(500, "Address must be less than 500 characters"),
  gradeApplyingFor: z.string()
    .min(1, "Please select a grade"),
  previousSchool: z.string().max(200, "School name too long").optional().or(z.literal("")),
  additionalInfo: z.string().max(1000, "Additional info too long").optional().or(z.literal(""))
});

export type AdmissionsFormData = z.infer<typeof admissionsSchema>;

// Gallery Management Validation
export const gallerySchema = z.object({
  title: z.string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  description: z.string()
    .max(500, "Description must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  image_url: z.string()
    .url("Must be a valid URL")
    .max(500, "URL too long"),
  category: z.string()
    .trim()
    .min(1, "Category is required")
    .max(50, "Category must be less than 50 characters"),
  display_order: z.number()
    .int("Must be a whole number")
    .min(0, "Display order cannot be negative")
    .max(9999, "Display order too large"),
  is_featured: z.boolean()
});

export type GalleryFormData = z.infer<typeof gallerySchema>;

// Hero Section Validation
export const heroSectionSchema = z.object({
  title: z.string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be less than 100 characters"),
  subtitle: z.string()
    .max(200, "Subtitle must be less than 200 characters")
    .optional()
    .or(z.literal("")),
  button_text: z.string()
    .trim()
    .min(1, "Button text is required")
    .max(50, "Button text must be less than 50 characters"),
  button_link: z.string()
    .trim()
    .min(1, "Button link is required")
    .max(200, "Button link too long")
    .refine((val) => val.startsWith("/") || val.startsWith("http"), "Must be a valid path or URL"),
  background_image: z.string()
    .max(500, "URL too long")
    .optional()
    .or(z.literal(""))
});

export type HeroSectionFormData = z.infer<typeof heroSectionSchema>;

// Assignment Validation
export const assignmentSchema = z.object({
  title: z.string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be less than 200 characters"),
  description: z.string()
    .max(2000, "Description must be less than 2000 characters")
    .optional()
    .or(z.literal("")),
  class_subject_id: z.string()
    .min(1, "Please select a class and subject"),
  due_date: z.string()
    .optional()
    .or(z.literal("")),
  max_marks: z.number()
    .int("Must be a whole number")
    .min(1, "Max marks must be at least 1")
    .max(1000, "Max marks cannot exceed 1000")
});

export type AssignmentFormData = z.infer<typeof assignmentSchema>;
