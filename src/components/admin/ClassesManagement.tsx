import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

interface Class {
  id: string;
  name: string;
  class_code: string | null;
  grade_level: number;
  section: string | null;
  academic_year: string;
}

interface ClassesManagementProps { readOnly?: boolean }

const ClassesManagement = ({ readOnly = false }: ClassesManagementProps) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);


  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .order("grade_level", { ascending: true });

      if (error) throw error;
      setClasses(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch classes: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();

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

  const handleSave = async (formData: FormData) => {
    try {
      const classCode = (formData.get("class_code") as string || "").toUpperCase().trim();
      
      // Validate class_code format (letters followed by digits)
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

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Classes {readOnly ? "" : "Management"}</CardTitle>
        {!readOnly && (
        <Dialog open={isDialogOpen && !editingClass} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingClass(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingClass(null); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Class
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Class</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)); }} className="space-y-4">
              <div>
                <Label>Class Code *</Label>
                <Input name="class_code" placeholder="e.g., CLASS01, GR10" required />
                <p className="text-xs text-muted-foreground mt-1">Unique ID: Letters followed by digits (e.g., CLASS01)</p>
              </div>
              <div>
                <Label>Class Name *</Label>
                <Input name="name" placeholder="e.g., Grade 10-A" required />
              </div>
              <div>
                <Label>Grade Level *</Label>
                <Input name="grade_level" type="number" min="1" max="12" required />
              </div>
              <div>
                <Label>Section</Label>
                <Input name="section" placeholder="e.g., A, B, C" />
              </div>
              <div>
                <Label>Academic Year *</Label>
                <Input name="academic_year" placeholder="e.g., 2024-2025" required />
              </div>
              <Button type="submit" className="w-full">Create Class</Button>
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
                  {!readOnly && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog open={isDialogOpen && editingClass?.id === cls.id} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingClass(null); }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setEditingClass(cls)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Class</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)); }} className="space-y-4">
                            <div>
                              <Label>Class Code *</Label>
                              <Input name="class_code" defaultValue={cls.class_code || ""} required />
                              <p className="text-xs text-muted-foreground mt-1">Unique ID: Letters followed by digits (e.g., CLASS01)</p>
                            </div>
                            <div>
                              <Label>Class Name *</Label>
                              <Input name="name" defaultValue={cls.name} required />
                            </div>
                            <div>
                              <Label>Grade Level *</Label>
                              <Input name="grade_level" type="number" min="1" max="12" defaultValue={cls.grade_level} required />
                            </div>
                            <div>
                              <Label>Section</Label>
                              <Input name="section" defaultValue={cls.section || ""} />
                            </div>
                            <div>
                              <Label>Academic Year *</Label>
                              <Input name="academic_year" defaultValue={cls.academic_year} required />
                            </div>
                            <Button type="submit" className="w-full">Save Changes</Button>
                          </form>
                        </DialogContent>
                      </Dialog>
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
