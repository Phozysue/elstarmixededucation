import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface Student {
  id: string;
  student_id: string;
  user_id: string;
  class_id: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  profile?: Profile;
}

interface Class {
  id: string;
  name: string;
  grade_level: number;
  section: string | null;
}

interface StudentsManagementProps { readOnly?: boolean }

const StudentsManagement = ({ readOnly = false }: StudentsManagementProps) => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userSearchQuery, setUserSearchQuery] = useState<string>("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [allowedClassIds, setAllowedClassIds] = useState<Set<string> | null>(null);

  const fetchData = async () => {
    try {
      // If readOnly (teacher view), figure out which classes this teacher is assigned to
      let allowed: Set<string> | null = null;
      if (readOnly && user) {
        const { data: teacherRow } = await supabase
          .from("teachers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (teacherRow) {
          const [classTeacherRes, subjectRes] = await Promise.all([
            supabase.from("classes").select("id").eq("class_teacher_id", teacherRow.id),
            supabase.from("class_subjects").select("class_id").eq("teacher_id", teacherRow.id),
          ]);
          const ids = new Set<string>();
          (classTeacherRes.data ?? []).forEach((c) => ids.add(c.id));
          (subjectRes.data ?? []).forEach((c) => ids.add(c.class_id));
          allowed = ids;
        } else {
          allowed = new Set();
        }
      }
      setAllowedClassIds(allowed);

      const [studentsRes, classesRes, profilesRes] = await Promise.all([
        supabase.from("students").select("*").order("created_at", { ascending: false }),
        supabase.from("classes").select("*").order("grade_level", { ascending: true }),
        supabase.from("profiles").select("id, full_name, email"),
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (classesRes.error) throw classesRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const profilesMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
      const studentsWithProfiles = (studentsRes.data || []).map(student => ({
        ...student,
        profile: profilesMap.get(student.user_id)
      }));

      setStudents(studentsWithProfiles);
      setClasses(classesRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (error: any) {
      toast.error("Failed to fetch data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("students-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [readOnly, user?.id]);

  const visibleClasses = useMemo(
    () => (allowedClassIds ? classes.filter((c) => allowedClassIds.has(c.id)) : classes),
    [classes, allowedClassIds]
  );

  const visibleStudents = useMemo(() => {
    let list = students;
    if (allowedClassIds) {
      list = list.filter((s) => s.class_id && allowedClassIds.has(s.class_id));
    }
    if (classFilter !== "all") {
      list = list.filter((s) => s.class_id === classFilter);
    }
    return list;
  }, [students, allowedClassIds, classFilter]);

  // Get profiles that are not already students
  const getAvailableProfiles = () => {
    const studentUserIds = new Set(students.map(s => s.user_id));
    return profiles.filter(p => !studentUserIds.has(p.id));
  };

  const handleSave = async (formData: FormData) => {
    try {
      const genderValue = formData.get("gender") as string;
      const data: any = {
        student_id: formData.get("student_id") as string,
        class_id: formData.get("class_id") as string || null,
        date_of_birth: formData.get("date_of_birth") as string || null,
        gender: genderValue && ["male", "female", "other"].includes(genderValue) ? genderValue : null,
        address: formData.get("address") as string || null,
        parent_name: formData.get("parent_name") as string || null,
        parent_phone: formData.get("parent_phone") as string || null,
        parent_email: formData.get("parent_email") as string || null,
      };

      if (editingStudent) {
        const { error } = await supabase.from("students").update(data).eq("id", editingStudent.id);
        if (error) throw error;
        toast.success("Student updated successfully");
      }

      setIsDialogOpen(false);
      setEditingStudent(null);
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    }
  };

  const handleAddStudent = async (formData: FormData) => {
    try {
      if (!selectedUserId) {
        toast.error("Please select a user");
        return;
      }

      const genderValue = formData.get("gender") as string;
      const validGender = genderValue && ["male", "female", "other"].includes(genderValue) 
        ? genderValue as "male" | "female" | "other" 
        : undefined;
      
      const data = {
        user_id: selectedUserId,
        student_id: formData.get("student_id") as string,
        class_id: formData.get("class_id") as string || undefined,
        date_of_birth: formData.get("date_of_birth") as string || undefined,
        gender: validGender,
        address: formData.get("address") as string || undefined,
        parent_name: formData.get("parent_name") as string || undefined,
        parent_phone: formData.get("parent_phone") as string || undefined,
        parent_email: formData.get("parent_email") as string || undefined,
      };

      const { error } = await supabase.from("students").insert([data]);
      if (error) throw error;

      // Also assign the student role to this user
      const { error: roleError } = await supabase.from("user_roles").insert([{
        user_id: selectedUserId,
        role: "student" as const,
      }]);

      if (roleError && !roleError.message.includes("duplicate")) {
        console.error("Failed to assign student role:", roleError);
      }

      toast.success("Student added successfully");
      setIsAddDialogOpen(false);
      setSelectedUserId("");
    } catch (error: any) {
      toast.error("Failed to add student: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;

    try {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
      toast.success("Student deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete: " + error.message);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  const availableProfiles = getAvailableProfiles();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Students {readOnly ? "" : "Management"}</CardTitle>
        {!readOnly && (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
              <DialogDescription>
                Select a user and fill in their student details.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleAddStudent(new FormData(e.currentTarget)); }} className="space-y-4">
              <div>
                <Label>Select User *</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        placeholder="Search by name..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="mb-2"
                      />
                    </div>
                    {availableProfiles.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No available users. All users are already students.
                      </div>
                    ) : (
                      availableProfiles
                        .filter((p) =>
                          p.full_name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                          p.email.toLowerCase().includes(userSearchQuery.toLowerCase())
                        )
                        .map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.full_name} ({profile.email})
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Admission Number *</Label>
                <Input name="student_id" placeholder="e.g., ADM2024001" required />
                <p className="text-xs text-muted-foreground mt-1">Unique admission number for this student</p>
              </div>
              <div>
                <Label>Class</Label>
                <Select name="class_id">
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input name="date_of_birth" type="date" />
              </div>
              <div>
                <Label>Gender</Label>
                <Select name="gender">
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Address</Label>
                <Input name="address" placeholder="Enter address" />
              </div>
              <div>
                <Label>Parent Name</Label>
                <Input name="parent_name" placeholder="Parent/Guardian name" />
              </div>
              <div>
                <Label>Parent Phone</Label>
                <Input name="parent_phone" placeholder="Parent phone number" />
              </div>
              <div>
                <Label>Parent Email</Label>
                <Input name="parent_email" type="email" placeholder="Parent email" />
              </div>
              <Button type="submit" className="w-full" disabled={!selectedUserId}>
                Add Student
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="w-full sm:w-64">
            <Label className="text-xs">Filter by class</Label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {visibleClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{c.section ? ` - ${c.section}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Showing {visibleStudents.length} student{visibleStudents.length === 1 ? "" : "s"}
            {readOnly ? " assigned to you" : ""}.
          </p>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admission No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Parent</TableHead>
                {!readOnly && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={readOnly ? 4 : 5} className="text-center text-muted-foreground py-8">
                    No students found.
                  </TableCell>
                </TableRow>
              ) : (
                visibleStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-mono font-medium">{student.student_id}</TableCell>
                    <TableCell>{student.profile?.full_name || "N/A"}</TableCell>
                    <TableCell>{classes.find((c) => c.id === student.class_id)?.name || "Not assigned"}</TableCell>
                    <TableCell>{student.parent_name || "N/A"}</TableCell>
                    {!readOnly && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog open={isDialogOpen && editingStudent?.id === student.id} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingStudent(null); }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setEditingStudent(student)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Student</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)); }} className="space-y-4">
                              <div>
                                <Label>Admission Number *</Label>
                                <Input name="student_id" defaultValue={student.student_id} required />
                                <p className="text-xs text-muted-foreground mt-1">Unique admission number for this student</p>
                              </div>
                              <div>
                                <Label>Class</Label>
                                <Select name="class_id" defaultValue={student.class_id || ""}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select class" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {classes.map((cls) => (
                                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Date of Birth</Label>
                                <Input name="date_of_birth" type="date" defaultValue={student.date_of_birth || ""} />
                              </div>
                              <div>
                                <Label>Gender</Label>
                                <Select name="gender" defaultValue={student.gender || ""}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select gender" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Address</Label>
                                <Input name="address" defaultValue={student.address || ""} />
                              </div>
                              <div>
                                <Label>Parent Name</Label>
                                <Input name="parent_name" defaultValue={student.parent_name || ""} />
                              </div>
                              <div>
                                <Label>Parent Phone</Label>
                                <Input name="parent_phone" defaultValue={student.parent_phone || ""} />
                              </div>
                              <div>
                                <Label>Parent Email</Label>
                                <Input name="parent_email" type="email" defaultValue={student.parent_email || ""} />
                              </div>
                              <Button type="submit" className="w-full">Save Changes</Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(student.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentsManagement;
