import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

interface Class {
  id: string;
  name: string;
  class_code: string | null;
  grade_level: number;
  section: string | null;
  academic_year: string;
  class_teacher_id: string | null;
}

interface TeacherOption {
  id: string;
  full_name: string;
  employee_id: string | null;
}

interface ClassesManagementProps { readOnly?: boolean }

const UNASSIGNED = "__none__";

const ClassesManagement = ({ readOnly = false }: ClassesManagementProps) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(UNASSIGNED);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .order("grade_level", { ascending: true });

      if (error) throw error;
      setClasses((data as any) || []);
    } catch (error: any) {
      toast.error("Failed to fetch classes: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    const { data } = await supabase
      .from("teachers")
      .select("id, full_name, employee_id")
      .order("full_name");
    setTeachers((data as any) || []);
  };

  useEffect(() => {
    fetchClasses();
    fetchTeachers();

    const channel = supabase
      .channel("classes-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "classes" }, () => {
        fetchClasses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const openAdd = () => {
    setEditingClass(null);
    setSelectedTeacherId(UNASSIGNED);
    setIsDialogOpen(true);
  };

  const openEdit = (cls: Class) => {
    setEditingClass(cls);
    setSelectedTeacherId(cls.class_teacher_id || UNASSIGNED);
    setIsDialogOpen(true);
  };

  const handleSave = async (formData: FormData) => {
    try {
      const classCode = (formData.get("class_code") as string || "").toUpperCase().trim();

      if (classCode && !/^[A-Z]+[0-9]+$/.test(classCode)) {
        toast.error("Class Code must be letters followed by digits (e.g., CLASS01, GR10)");
        return;
      }

      const data = {
        name: formData.get("name") as string,
        class_code: classCode || null,
        grade_level: parseInt(formData.get("grade_level") as string),
        section: formData.get("section") as string || null,
        academic_year: formData.get("academic_year") as string,
        class_teacher_id: selectedTeacherId === UNASSIGNED ? null : selectedTeacherId,
      };

      if (editingClass) {
        const { error } = await supabase.from("classes").update(data).eq("id", editingClass.id);
        if (error) throw error;
        toast.success("Class updated successfully");
      } else {
        const { error } = await supabase.from("classes").insert(data);
        if (error) throw error;
        toast.success("Class created successfully");
      }

      setIsDialogOpen(false);
      setEditingClass(null);
      setSelectedTeacherId(UNASSIGNED);
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this class?")) return;

    try {
      const { error } = await supabase.from("classes").delete().eq("id", id);
      if (error) throw error;
      toast.success("Class deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete: " + error.message);
    }
  };

  const teacherName = (id: string | null) => {
    if (!id) return "—";
    const t = teachers.find((x) => x.id === id);
    return t ? t.full_name : "—";
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  const formFields = (cls?: Class | null) => (
    <>
      <div>
        <Label>Class Code *</Label>
        <Input name="class_code" defaultValue={cls?.class_code || ""} placeholder="e.g., CLASS01, GR10" required />
        <p className="text-xs text-muted-foreground mt-1">Letters followed by digits (e.g., CLASS01)</p>
      </div>
      <div>
        <Label>Class Name *</Label>
        <Input name="name" defaultValue={cls?.name || ""} placeholder="e.g., Grade 10-A" required />
      </div>
      <div>
        <Label>Grade Level *</Label>
        <Input name="grade_level" type="number" min="1" max="12" defaultValue={cls?.grade_level} required />
      </div>
      <div>
        <Label>Section</Label>
        <Input name="section" defaultValue={cls?.section || ""} placeholder="e.g., A, B, C" />
      </div>
      <div>
        <Label>Academic Year *</Label>
        <Input name="academic_year" defaultValue={cls?.academic_year || ""} placeholder="e.g., 2024-2025" required />
      </div>
      <div>
        <Label>Class Teacher</Label>
        <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
          <SelectTrigger>
            <SelectValue placeholder="Select class teacher" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>— Unassigned —</SelectItem>
            {teachers.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.full_name}{t.employee_id ? ` (${t.employee_id})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">The class teacher marks daily attendance for this class.</p>
      </div>
      <Button type="submit" className="w-full">{cls ? "Save Changes" : "Create Class"}</Button>
    </>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Classes {readOnly ? "" : "Management"}</CardTitle>
        {!readOnly && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingClass(null); setSelectedTeacherId(UNASSIGNED); } }}>
            <DialogTrigger asChild>
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingClass ? "Edit Class" : "Add New Class"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)); }} className="space-y-4">
                {formFields(editingClass)}
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Grade Level</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Class Teacher</TableHead>
                {!readOnly && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell className="font-mono font-medium">{cls.class_code || "N/A"}</TableCell>
                  <TableCell>{cls.name}</TableCell>
                  <TableCell>{cls.grade_level}</TableCell>
                  <TableCell>{cls.section || "N/A"}</TableCell>
                  <TableCell>{cls.academic_year}</TableCell>
                  <TableCell>{teacherName(cls.class_teacher_id)}</TableCell>
                  {!readOnly && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(cls)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(cls.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClassesManagement;
