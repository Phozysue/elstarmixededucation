
# School Management Expansion Plan

Delivered in 4 phases. Each phase = one DB migration + related code. I'll ship phase 1 first, then continue through phases 2–4 without further approval unless something changes.

## Phase 1 — Roles & Access Control (foundation)

**DB migration**
- Extend `user_role` enum: add `parent`, `principal`, `bursar`, `class_teacher`.
- New `parent_students` table linking `parent_user_id` → `student_id` (many-to-many).
- Helper functions: `is_parent_of(student_id)`, `has_any_role(roles[])`.
- Update `enforce_single_role` trigger to allow admin + one extra (already supported).
- Extend RLS on `students`, `exam_results`, `report_cards`, `student_fees`, `fee_payments`, `attendance`, `announcements` so:
  - parent → only linked children
  - principal → school-wide read
  - bursar → fees/payments read+write, no results
  - class_teacher → same as teacher, plus class-wide attendance/remarks
- GRANTs on new table.

**Code**
- `RoleProtectedRoute` accepts new roles.
- Auth redirect logic routes each role to its dashboard.
- Admin `UserManagement` gains role dropdown with all 6 roles + "Link parent to student" UI.

## Phase 2 — Result Approval / Publish Lock

**DB**
- `exams.status` enum: `draft` | `submitted` | `approved` | `published`.
- `exam_results.locked boolean default false`.
- RLS: students/parents see results only when `exams.status='published'`.
- Teachers can UPDATE `exam_results` only where `locked=false`.
- Trigger on `exams.status → published` sets `locked=true` on all results.

**Code**
- Teacher dashboard: submit-for-approval button; disable edit when locked.
- New Principal dashboard: pending exams queue, approve → publish action.

## Phase 3 — New Dashboards

- `/parent` — profile per child, results (published only), report card viewer/PDF, attendance, fee balance & payment history, announcements.
- `/principal` — school KPIs, best classes/students, subject & teacher analytics (recharts), attendance %, fee collection summary, pending approvals, announcements manager.
- `/bursar` — record payments, print PDF receipt, student search, outstanding balances, daily/monthly/annual financial reports, send fee reminder (simple mark).
- `/class-teacher` — routed automatically when a teacher is a `class_teacher_id` on any class; attendance grid, conduct remarks, class-wide announcement, report-card comment field.

Each dashboard shares the existing sidebar/topbar shell for visual consistency.

## Phase 4 — Exports

- Install `xlsx` and `jspdf` + `jspdf-autotable`.
- Reusable helpers `src/lib/exportExcel.ts`, `src/lib/exportPdf.ts`.
- Add "Export Excel" buttons: Admin Students list, Fees list, Results view.
- PDF: fee receipt (Bursar), fee statement (Bursar & Student), principal school-performance report.

## Technical notes

- No changes to existing Admin/Teacher/Student flows beyond the approval lock and export buttons.
- Parent accounts are Admin-provisioned only (existing policy — public signup stays disabled).
- All new tables get GRANTs + RLS in the same migration.
- Analytics use existing `recharts` dep. PDFs use jsPDF (no server rendering).

## Out of scope for this pass

- Timetable module (not in existing schema; can add later if you want).
- SMS/email fee reminders (only in-app flag for now).
- Multi-language, custom grading systems editor (existing grading logic stays).

Starting with Phase 1 on your approval.
