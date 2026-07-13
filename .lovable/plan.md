

## Plan: Admin Student/Teacher Assignment by Name and Restrict Library Access

### What will change

**1. Library restricted to students and teachers only (not public)**

Currently, the Library link appears in the navigation for everyone, and the `library_books` table has an RLS policy allowing public SELECT. Changes:

- Update the navigation to only show the "Library" link when the user has a role of `admin`, `teacher`, or `student`
- The `RoleProtectedRoute` wrapper on the `/library` route already restricts access to these roles -- this stays as-is
- Update the `library_books` RLS policy to restrict SELECT to authenticated users with the correct roles (remove the public "Everyone can view" policy and replace it with a role-checked one)

**2. Admin can assign students and teachers by name**

Currently, when adding a student or teacher, the admin selects from a dropdown showing `full_name (email)`. This already shows names. However, I'll improve the experience by:

- Adding a search/filter input in the user selection dropdowns for both Students and Teachers management, so admins can quickly find users by typing a name
- Displaying names more prominently in the selection list

---

### Technical Details

**Database migration:**
- Drop the existing `Everyone can view library books` RLS policy
- Create a new policy that only allows SELECT for users with admin, teacher, or student roles using the existing `has_role()` function

**Navigation (src/components/Navigation.tsx):**
- Conditionally show the Library nav item only when `userRole` is `admin`, `teacher`, or `student`

**StudentsManagement.tsx and TeachersManagement.tsx:**
- Add a search input above the user selection dropdown to filter profiles by name
- This makes it easier for admins to find and assign users when there are many profiles

**Files to modify:**
- `src/components/Navigation.tsx` - hide Library link for non-authenticated/public users
- `src/components/admin/StudentsManagement.tsx` - add name search filter for user selection
- `src/components/admin/TeachersManagement.tsx` - add name search filter for user selection
- Database migration - update `library_books` RLS policy

