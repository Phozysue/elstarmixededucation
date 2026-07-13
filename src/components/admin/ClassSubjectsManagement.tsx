import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Link2 } from "lucide-react";

interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string | null;
  classes: { id: string; name: string; class_code: string | null };
  subjects: { id: string; name: string; code: string };
}

interface ClassInfo {
  id: string;
  name: string;
  class_code: string | null;
}

interface SubjectInfo {
  id: string;
  name: string;
  code: string;
}

const ClassSubjectsManagement = () => {
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  const fetchData = async () => {
    try {
      const [classSubjectsRes, classesRes, subjectsRes] = await Promise.all([
        supabase
          .from("class_subjects")
          .select("*, classes(id, name, class_code), subjects(id, name, code)")
          .order("class_id"),
        supabase.from("classes").select("id, name, class_code").order("name"),
        supabase.from("subjects").select("id, name, code").order("name"),
      ]);

      if (classSubjectsRes.error) throw classSubjectsRes.error;
      if (classesRes.error) throw classesRes.error;
      if (subjectsRes.error) throw subjectsRes.error;

      setClassSubjects(classSubjectsRes.data || []);
      setClasses(classesRes.data || []);
      setSubjects(subjectsRes.data || []);
    } catch (error: any) {
      toast.error("Failed to fetch data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("class-subjects-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "class_subjects" }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAssign = async () => {
    if (!selectedClass || !selectedSubject) {
      toast.error("Please select both a class and a subject");
      return;
    }

    // Check if already assigned
    const exists = classSubjects.some(
      (cs) => cs.class_id === selectedClass && cs.subject_id === selectedSubject
    );

    if (exists) {
      toast.error("This subject is already assigned to this class");
      return;
    }

    try {
      const { error } = await supabase.from("class_subjects").insert({
        class_id: selectedClass,
        subject_id: selectedSubject,
      });

      if (error) throw error;

      toast.success("Subject assigned to class successfully");
      setIsDialogOpen(false);
      setSelectedClass("");
      setSelectedSubject("");
    } catch (error: any) {
      toast.error("Failed to assign: " + error.message);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Are you sure you want to remove this subject assignment? This will affect any assignments linked to this class-subject pair.")) {
      return;
    }

    try {
      const { error } = await supabase.from("class_subjects").delete().eq("id", id);
      if (error) throw error;
      toast.success("Subject removed from class successfully");
    } catch (error: any) {
      toast.error("Failed to remove: " + error.message);
    }
  };

  // Group class subjects by class for better display
  const groupedByClass = classSubjects.reduce((acc, cs) => {
    const className = cs.classes?.name || "Unknown Class";
    if (!acc[className]) {
      acc[className] = [];
    }
    acc[className].push(cs);
    return acc;
  }, {} as Record<string, ClassSubject[]>);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Class-Subject Assignments
          </CardTitle>
          <CardDescription>
            Assign subjects to classes so you can create assignments for specific class-subject combinations
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setSelectedClass(""); setSelectedSubject(""); }}>
              <Plus className="h-4 w-4 mr-2" />
              Assign Subject to Class
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Subject to Class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select Class *</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} {cls.class_code ? `(${cls.class_code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {classes.length === 0 && (
                  <p className="text-sm text-destructive mt-1">
                    No classes found. Please add classes first.
                  </p>
                )}
              </div>
              <div>
                <Label>Select Subject *</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name} ({subject.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {subjects.length === 0 && (
                  <p className="text-sm text-destructive mt-1">
                    No subjects found. Please add subjects first.
                  </p>
                )}
              </div>
              <Button 
                onClick={handleAssign} 
                className="w-full"
                disabled={!selectedClass || !selectedSubject}
              >
                Assign Subject
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {classSubjects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No subjects assigned to classes yet</p>
            <p className="text-sm mt-1">
              Click "Assign Subject to Class" to link subjects to classes, then you can create assignments.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByClass).map(([className, items]) => (
              <div key={className} className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2 font-medium">
                  {className}
                  {items[0]?.classes?.class_code && (
                    <span className="ml-2 text-sm font-mono text-muted-foreground">
                      ({items[0].classes.class_code})
                    </span>
                  )}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Subject Code</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((cs) => (
                      <TableRow key={cs.id}>
                        <TableCell className="font-medium">{cs.subjects?.name}</TableCell>
                        <TableCell className="font-mono text-sm">{cs.subjects?.code}</TableCell>
                        <TableCell>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleRemove(cs.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClassSubjectsManagement;
