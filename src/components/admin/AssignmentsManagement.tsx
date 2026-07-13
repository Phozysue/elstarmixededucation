import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Upload, FileText, Loader2 } from "lucide-react";
import { assignmentSchema } from "@/lib/validations";
import { extractStoragePath } from "@/lib/storagePaths";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  max_marks: number;
  class_subject_id: string;
  file_url: string | null;
}

interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  classes: { name: string };
  subjects: { name: string };
}

const AssignmentsManagement = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClassSubject, setSelectedClassSubject] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const [assignmentsRes, classSubjectsRes] = await Promise.all([
        supabase.from("assignments").select("*").order("created_at", { ascending: false }),
        supabase.from("class_subjects").select("*, classes(name), subjects(name)"),
      ]);

      if (assignmentsRes.error) throw assignmentsRes.error;
      if (classSubjectsRes.error) throw classSubjectsRes.error;

      setAssignments(assignmentsRes.data || []);
      setClassSubjects(classSubjectsRes.data || []);
    } catch (error: any) {
      toast.error("Failed to fetch data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("assignments-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments" }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!validTypes.includes(file.type)) {
      toast.error("Please select a PDF or Word document");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be less than 10MB");
      return;
    }

    setSelectedFile(file);
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("assignment-files")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    return fileName;
  };

  const openAssignmentFile = async (fileUrl: string) => {
    const path = extractStoragePath(fileUrl, "assignment-files");
    const loadingToast = toast.loading("Preparing document...");

    try {
      const { data, error } = await supabase.storage
        .from("assignment-files")
        .createSignedUrl(path, 60 * 10);

      if (error || !data?.signedUrl) throw error || new Error("Could not prepare document link");

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      toast.success("Document opened", { id: loadingToast });
    } catch (error: any) {
      toast.error("Could not open this document", {
        id: loadingToast,
        description: error?.status === 404 || /not found|bucket/i.test(error?.message || "")
          ? "The file is missing or was uploaded before private document links were enabled. Please re-upload it."
          : "Please try again. If it continues, re-upload the file.",
        action: {
          label: "Try again",
          onClick: () => openAssignmentFile(fileUrl),
        },
      });
    }
  };

  const handleSave = async (formData: FormData) => {
    const rawData = {
      title: (formData.get("title") as string || "").trim(),
      description: (formData.get("description") as string || "").trim(),
      class_subject_id: selectedClassSubject || formData.get("class_subject_id") as string || "",
      due_date: formData.get("due_date") as string || "",
      max_marks: parseInt(formData.get("max_marks") as string) || 100,
    };

    // Validate
    const result = assignmentSchema.safeParse(rawData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    if (!editingAssignment && !selectedFile) {
      toast.error("Please upload a PDF or Word document for the assignment");
      return;
    }

    setUploading(true);

    try {
      let file_url = editingAssignment?.file_url || null;

      if (selectedFile) {
        file_url = await uploadFile(selectedFile);
      }

      const data = {
        title: result.data.title,
        description: result.data.description || null,
        class_subject_id: result.data.class_subject_id,
        due_date: result.data.due_date || null,
        max_marks: result.data.max_marks,
        file_url,
        created_by: user?.id,
      };

      if (editingAssignment) {
        const { error } = await supabase.from("assignments").update(data).eq("id", editingAssignment.id);
        if (error) throw error;
        toast.success("Assignment updated successfully");
      } else {
        const { error } = await supabase.from("assignments").insert(data);
        if (error) throw error;
        toast.success("Assignment created successfully");
      }

      setIsDialogOpen(false);
      setEditingAssignment(null);
      setSelectedClassSubject("");
      setSelectedFile(null);
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return;

    try {
      const { error } = await supabase.from("assignments").delete().eq("id", id);
      if (error) throw error;
      toast.success("Assignment deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete: " + error.message);
    }
  };

  const openEditDialog = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setSelectedClassSubject(assignment.class_subject_id);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingAssignment(null);
    setSelectedClassSubject("");
    setSelectedFile(null);
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Assignments Management</CardTitle>
        <Dialog open={isDialogOpen && !editingAssignment} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingAssignment(null); setSelectedClassSubject(""); } }}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Assignment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Assignment</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)); }} className="space-y-4">
              <div>
                <Label>Assignment File (PDF/DOC) *</Label>
                <div className="mt-2">
                  <div 
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {selectedFile ? selectedFile.name : "Click to select PDF or Word document"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Max 10MB</p>
                  </div>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>
              <div>
                <Label>Title *</Label>
                <Input name="title" required maxLength={200} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea name="description" maxLength={2000} placeholder="Brief description of the assignment..." />
              </div>
              <div>
                <Label>Class & Subject *</Label>
                <Select value={selectedClassSubject} onValueChange={setSelectedClassSubject} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class and subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {classSubjects.map((cs) => (
                      <SelectItem key={cs.id} value={cs.id}>
                        {cs.classes.name} - {cs.subjects.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="class_subject_id" value={selectedClassSubject} />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input name="due_date" type="datetime-local" />
              </div>
              <div>
                <Label>Max Marks</Label>
                <Input name="max_marks" type="number" defaultValue="100" min="1" max="1000" />
              </div>
              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : "Create Assignment"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Class & Subject</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Max Marks</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => {
                const classSubject = classSubjects.find((cs) => cs.id === assignment.class_subject_id);
                return (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div className="font-medium">{assignment.title}</div>
                    </TableCell>
                    <TableCell>
                      {classSubject ? (
                        <div className="text-sm">
                          <div className="font-medium">{classSubject.classes.name}</div>
                          <div className="text-muted-foreground">{classSubject.subjects.name}</div>
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {assignment.file_url ? (
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 inline-flex items-center gap-1"
                          onClick={() => openAssignmentFile(assignment.file_url!)}
                        >
                          <FileText className="h-4 w-4" />
                          View
                        </Button>
                      ) : "-"}
                    </TableCell>
                    <TableCell>{assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : "No due date"}</TableCell>
                    <TableCell>{assignment.max_marks}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog open={isDialogOpen && editingAssignment?.id === assignment.id} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingAssignment(null); setSelectedClassSubject(""); setSelectedFile(null); } }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(assignment)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Assignment</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)); }} className="space-y-4">
                              <div>
                                <Label>Assignment File (PDF/DOC)</Label>
                                <div className="mt-2">
                                  {assignment.file_url && !selectedFile && (
                                    <Button
                                      type="button"
                                      variant="link"
                                      className="h-auto p-0 inline-flex items-center gap-2 mb-2"
                                      onClick={() => openAssignmentFile(assignment.file_url!)}
                                    >
                                      <FileText className="h-4 w-4" />
                                      Current file
                                    </Button>
                                  )}
                                  <div 
                                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                  >
                                    <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">
                                      {selectedFile ? selectedFile.name : "Click to replace file"}
                                    </p>
                                  </div>
                                  <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label>Title *</Label>
                                <Input name="title" defaultValue={assignment.title} required maxLength={200} />
                              </div>
                              <div>
                                <Label>Description</Label>
                                <Textarea name="description" defaultValue={assignment.description || ""} maxLength={2000} />
                              </div>
                              <div>
                                <Label>Class & Subject *</Label>
                                <Select value={selectedClassSubject} onValueChange={setSelectedClassSubject}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {classSubjects.map((cs) => (
                                      <SelectItem key={cs.id} value={cs.id}>
                                        {cs.classes.name} - {cs.subjects.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <input type="hidden" name="class_subject_id" value={selectedClassSubject} />
                              </div>
                              <div>
                                <Label>Due Date</Label>
                                <Input name="due_date" type="datetime-local" defaultValue={assignment.due_date || ""} />
                              </div>
                              <div>
                                <Label>Max Marks</Label>
                                <Input name="max_marks" type="number" defaultValue={assignment.max_marks} min="1" max="1000" />
                              </div>
                              <Button type="submit" className="w-full" disabled={uploading}>
                                {uploading ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                  </>
                                ) : "Save Changes"}
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(assignment.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssignmentsManagement;
