export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      academic_terms: {
        Row: {
          academic_year: string
          created_at: string
          end_date: string
          id: string
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          created_at?: string
          end_date: string
          id?: string
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      admission_applications: {
        Row: {
          additional_info: string | null
          address: string
          created_at: string | null
          date_of_birth: string
          gender: string
          grade_applying_for: string
          id: string
          parent_email: string
          parent_name: string
          parent_phone: string
          previous_school: string | null
          status: string | null
          student_name: string
          updated_at: string | null
        }
        Insert: {
          additional_info?: string | null
          address: string
          created_at?: string | null
          date_of_birth: string
          gender: string
          grade_applying_for: string
          id?: string
          parent_email: string
          parent_name: string
          parent_phone: string
          previous_school?: string | null
          status?: string | null
          student_name: string
          updated_at?: string | null
        }
        Update: {
          additional_info?: string | null
          address?: string
          created_at?: string | null
          date_of_birth?: string
          gender?: string
          grade_applying_for?: string
          id?: string
          parent_email?: string
          parent_name?: string
          parent_phone?: string
          previous_school?: string | null
          status?: string | null
          student_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string
          id: string
          is_urgent: boolean | null
          target_audience: string[]
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by: string
          id?: string
          is_urgent?: boolean | null
          target_audience: string[]
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string
          id?: string
          is_urgent?: boolean | null
          target_audience?: string[]
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          feedback: string | null
          file_url: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          marks_obtained: number | null
          student_id: string
          submission_text: string | null
          submitted_at: string | null
        }
        Insert: {
          assignment_id: string
          feedback?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          marks_obtained?: number | null
          student_id: string
          submission_text?: string | null
          submitted_at?: string | null
        }
        Update: {
          assignment_id?: string
          feedback?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          marks_obtained?: number | null
          student_id?: string
          submission_text?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          class_subject_id: string
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          file_url: string | null
          id: string
          max_marks: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          class_subject_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          file_url?: string | null
          id?: string
          max_marks?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          class_subject_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          file_url?: string | null
          id?: string
          max_marks?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_class_subject_id_fkey"
            columns: ["class_subject_id"]
            isOneToOne: false
            referencedRelation: "class_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          class_id: string
          created_at: string | null
          date: string
          id: string
          marked_by: string
          remarks: string | null
          status: string
          student_id: string
          term_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          date: string
          id?: string
          marked_by: string
          remarks?: string | null
          status: string
          student_id: string
          term_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          date?: string
          id?: string
          marked_by?: string
          remarks?: string | null
          status?: string
          student_id?: string
          term_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      class_subjects: {
        Row: {
          class_id: string
          id: string
          subject_id: string
          teacher_id: string | null
        }
        Insert: {
          class_id: string
          id?: string
          subject_id: string
          teacher_id?: string | null
        }
        Update: {
          class_id?: string
          id?: string
          subject_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year: string
          class_code: string | null
          class_teacher_id: string | null
          created_at: string | null
          grade_level: number
          id: string
          name: string
          section: string | null
          updated_at: string | null
        }
        Insert: {
          academic_year: string
          class_code?: string | null
          class_teacher_id?: string | null
          created_at?: string | null
          grade_level: number
          id?: string
          name: string
          section?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_year?: string
          class_code?: string | null
          class_teacher_id?: string | null
          created_at?: string | null
          grade_level?: number
          id?: string
          name?: string
          section?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_class_teacher_id_fkey"
            columns: ["class_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          status: string | null
          subject: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string | null
          event_date: string
          id: string
          location: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date?: string | null
          event_date: string
          id?: string
          location?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string | null
          event_date?: string
          id?: string
          location?: string | null
          title?: string
        }
        Relationships: []
      }
      exam_results: {
        Row: {
          created_at: string | null
          exam_id: string
          grade: string | null
          id: string
          locked: boolean
          marks_obtained: number
          max_marks: number
          remarks: string | null
          student_id: string
          subject_id: string
        }
        Insert: {
          created_at?: string | null
          exam_id: string
          grade?: string | null
          id?: string
          locked?: boolean
          marks_obtained: number
          max_marks: number
          remarks?: string | null
          student_id: string
          subject_id: string
        }
        Update: {
          created_at?: string | null
          exam_id?: string
          grade?: string | null
          id?: string
          locked?: boolean
          marks_obtained?: number
          max_marks?: number
          remarks?: string | null
          student_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          academic_year: string
          approved_at: string | null
          approved_by: string | null
          class_id: string
          created_at: string | null
          end_date: string
          exam_type: string
          id: string
          name: string
          published_at: string | null
          start_date: string
          status: Database["public"]["Enums"]["exam_status"]
        }
        Insert: {
          academic_year: string
          approved_at?: string | null
          approved_by?: string | null
          class_id: string
          created_at?: string | null
          end_date: string
          exam_type: string
          id?: string
          name: string
          published_at?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["exam_status"]
        }
        Update: {
          academic_year?: string
          approved_at?: string | null
          approved_by?: string | null
          class_id?: string
          created_at?: string | null
          end_date?: string
          exam_type?: string
          id?: string
          name?: string
          published_at?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["exam_status"]
        }
        Relationships: [
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string | null
          note: string | null
          paid_on: string
          recorded_by: string | null
          reference: string | null
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string | null
          note?: string | null
          paid_on?: string
          recorded_by?: string | null
          reference?: string | null
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          note?: string | null
          paid_on?: string
          recorded_by?: string | null
          reference?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery: {
        Row: {
          category: string
          created_at: string | null
          created_by: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string
          is_featured: boolean | null
          media_type: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          created_by: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_featured?: boolean | null
          media_type?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_featured?: boolean | null
          media_type?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hero_images: {
        Row: {
          created_at: string | null
          created_by: string
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      hero_section: {
        Row: {
          background_image: string | null
          button_link: string
          button_text: string
          created_at: string | null
          id: string
          subtitle: string | null
          title: string
          updated_at: string | null
          updated_by: string
        }
        Insert: {
          background_image?: string | null
          button_link?: string
          button_text?: string
          created_at?: string | null
          id?: string
          subtitle?: string | null
          title: string
          updated_at?: string | null
          updated_by: string
        }
        Update: {
          background_image?: string | null
          button_link?: string
          button_text?: string
          created_at?: string | null
          id?: string
          subtitle?: string | null
          title?: string
          updated_at?: string | null
          updated_by?: string
        }
        Relationships: []
      }
      important_dates: {
        Row: {
          created_at: string
          created_by: string
          deadline_text: string
          display_order: number
          id: string
          is_active: boolean
          label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deadline_text: string
          display_order?: number
          id?: string
          is_active?: boolean
          label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deadline_text?: string
          display_order?: number
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      library_books: {
        Row: {
          author: string
          available_quantity: number
          category: string
          cover_image_url: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          isbn: string | null
          pdf_url: string | null
          published_year: number | null
          publisher: string | null
          quantity: number
          title: string
          updated_at: string | null
        }
        Insert: {
          author: string
          available_quantity?: number
          category?: string
          cover_image_url?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          isbn?: string | null
          pdf_url?: string | null
          published_year?: number | null
          publisher?: string | null
          quantity?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          author?: string
          available_quantity?: number
          category?: string
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          isbn?: string | null
          pdf_url?: string | null
          published_year?: number | null
          publisher?: string | null
          quantity?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      parent_students: {
        Row: {
          created_at: string
          id: string
          parent_user_id: string
          relationship: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_user_id: string
          relationship?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_user_id?: string
          relationship?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      principal_info: {
        Row: {
          created_at: string
          email: string | null
          id: string
          image_url: string | null
          message: string
          name: string
          phone: string | null
          title: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          image_url?: string | null
          message: string
          name: string
          phone?: string | null
          title?: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          image_url?: string | null
          message?: string
          name?: string
          phone?: string | null
          title?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      report_cards: {
        Row: {
          academic_year: string
          class_id: string
          created_at: string
          id: string
          pdf_path: string | null
          remarks: string | null
          student_id: string
          term: string
          term_id: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          academic_year: string
          class_id: string
          created_at?: string
          id?: string
          pdf_path?: string | null
          remarks?: string | null
          student_id: string
          term: string
          term_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          academic_year?: string
          class_id?: string
          created_at?: string
          id?: string
          pdf_path?: string | null
          remarks?: string | null
          student_id?: string
          term?: string
          term_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_cards_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      student_fees: {
        Row: {
          academic_year: string
          created_at: string
          id: string
          notes: string | null
          student_id: string
          total_due: number
          total_paid: number
          updated_at: string
        }
        Insert: {
          academic_year: string
          created_at?: string
          id?: string
          notes?: string | null
          student_id: string
          total_due?: number
          total_paid?: number
          updated_at?: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          id?: string
          notes?: string | null
          student_id?: string
          total_due?: number
          total_paid?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_fees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          admission_date: string | null
          class_id: string | null
          created_at: string | null
          date_of_birth: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          parent_email: string | null
          parent_name: string | null
          parent_phone: string | null
          student_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          admission_date?: string | null
          class_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          student_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          admission_date?: string | null
          class_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          student_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_students_class"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      teacher_directory: {
        Row: {
          join_date: string | null
          qualification: string | null
          specialization: string | null
          staff_no: string
          teacher_id: string
          user_id: string
        }
        Insert: {
          join_date?: string | null
          qualification?: string | null
          specialization?: string | null
          staff_no: string
          teacher_id: string
          user_id: string
        }
        Update: {
          join_date?: string | null
          qualification?: string | null
          specialization?: string | null
          staff_no?: string
          teacher_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_directory_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          address: string | null
          created_at: string | null
          date_of_birth: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          join_date: string | null
          qualification: string | null
          specialization: string | null
          teacher_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          join_date?: string | null
          qualification?: string | null
          specialization?: string | null
          teacher_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          join_date?: string | null
          qualification?: string | null
          specialization?: string | null
          teacher_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          avatar_url: string | null
          content: string
          created_at: string | null
          id: string
          is_featured: boolean | null
          name: string
          rating: number | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_featured?: boolean | null
          name: string
          rating?: number | null
          role: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_featured?: boolean | null
          name?: string
          rating?: number | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      principal_info_public: {
        Row: {
          created_at: string | null
          id: string | null
          image_url: string | null
          message: string | null
          name: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          message?: string | null
          name?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          message?: string | null
          name?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_class_teacher: {
        Args: { _class_id: string; _user_id: string }
        Returns: boolean
      }
      is_parent_of: {
        Args: { _student_id: string; _user_id: string }
        Returns: boolean
      }
      is_subject_teacher: {
        Args: { _class_id: string; _subject_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      exam_status: "draft" | "submitted" | "approved" | "published"
      gender: "male" | "female" | "other"
      user_role:
        | "admin"
        | "teacher"
        | "student"
        | "parent"
        | "principal"
        | "bursar"
        | "class_teacher"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      exam_status: ["draft", "submitted", "approved", "published"],
      gender: ["male", "female", "other"],
      user_role: [
        "admin",
        "teacher",
        "student",
        "parent",
        "principal",
        "bursar",
        "class_teacher",
      ],
    },
  },
} as const
