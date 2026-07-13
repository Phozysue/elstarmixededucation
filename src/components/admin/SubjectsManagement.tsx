import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

interface Subject {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

const SubjectsManagement = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setSubjects(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch subjects: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();

    const channel = supabase
      .channel("subjects-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "subjects" }, () => {
        fetchSubjects();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSave = async (formData: FormData, isNew: boolean) => {
    try {
      const data = {
        name: formData.get("name") as string,
        code: formData.get("code") as string,
        description: (formData.get("description") as string) || null,
      };

      if (isNew) {
        const { error } = await supabase.from("subjects").insert(data);
        if (error) throw error;
        toast.success("Subject created successfully");
        setIsAddDialogOpen(false);
      } else if (editingSubject) {
        const { error } = await supabase.from("subjects").update(data).eq("id", editingSubject.id);
        if (error) throw error;
        toast.success("Subject updated successfully");
        setIsDialogOpen(false);
        setEditingSubject(null);
      }
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subject?")) return;

    try {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
      toast.success("Subject deleted successfully");
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
        <CardTitle>Subjects Management</CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Subject</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget), true); }} className="space-y-4">
              <div>
                <Label>Subject Code *</Label>
                <Input name="code" placeholder="e.g., MATH101, ENG201" required />
                <p className="text-xs text-muted-foreground mt-1">Unique identifier for this subject</p>
              </div>
              <div>
                <Label>Subject Name *</Label>
                <Input name="name" placeholder="e.g., Mathematics" required />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea name="description" placeholder="Subject description..." />
              </div>
              <Button type="submit" className="w-full">Create Subject</Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No subjects found. Click "Add Subject" to add one.
                  </TableCell>
                </TableRow>
              ) : (
                subjects.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-mono">{subject.code}</TableCell>
                    <TableCell>{subject.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{subject.description || "N/A"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog open={isDialogOpen && editingSubject?.id === subject.id} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingSubject(null); }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setEditingSubject(subject)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Subject</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget), false); }} className="space-y-4">
                              <div>
                                <Label>Subject Code *</Label>
                                <Input name="code" defaultValue={subject.code} required />
                                <p className="text-xs text-muted-foreground mt-1">Unique identifier for this subject</p>
                              </div>
                              <div>
                                <Label>Subject Name *</Label>
                                <Input name="name" defaultValue={subject.name} required />
                              </div>
                              <div>
                                <Label>Description</Label>
                                <Textarea name="description" defaultValue={subject.description || ""} />
                              </div>
                              <Button type="submit" className="w-full">Save Changes</Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(subject.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
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

export default SubjectsManagement;
