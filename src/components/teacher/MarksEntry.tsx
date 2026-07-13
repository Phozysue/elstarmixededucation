import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ClipboardEdit, Save } from "lucide-react";

interface Assignment { class_id: string; subject_id: string; class_name: string; subject_name: string; }
interface Student { id: string; student_id: string; full_name: string; }
interface Exam { id: string; name: string; }

const MarksEntry = () => {
  const { user } = useAuth();
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string>("");
  const [exams, setExams] = useState<Exam[]>([]);
  const [examId, setExamId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, { marks_obtained: string; max_marks: string; grade: string; remarks: string; id?: string }>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      const { data: t } = await supabase.from("teachers").select("id").eq("user_id", user.id).maybeSingle();
      if (!t) return;
      setTeacherId(t.id);
      const { data: cs } = await supabase.from("class_subjects")
        .select("class_id, subject_id, classes(name), subjects(name)")
        .eq("teacher_id", t.id);
      const list = (cs ?? []).map((r: any) => ({
        class_id: r.class_id,
        subject_id: r.subject_id,
        class_name: r.classes?.name ?? "?",
        subject_name: r.subjects?.name ?? "?",
      }));
      setAssignments(list);
    };
    init();
  }, [user]);

  const current = assignments.find(a => `${a.class_id}::${a.subject_id}` === selectedAssignment);

  useEffect(() => {
    if (!current) { setExams([]); setExamId(""); return; }
    supabase.from("exams").select("id, name").eq("class_id", current.class_id).order("start_date", { ascending: false })
      .then(({ data }) => setExams(data ?? []));
  }, [selectedAssignment]);

  useEffect(() => {
    const load = async () => {
      if (!current || !examId) { setStudents([]); setMarks({}); return; }
      setLoading(true);
      const { data: sts } = await supabase.from("students").select("id, student_id, user_id").eq("class_id", current.class_id);
      const userIds = (sts ?? []).map((s: any) => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
      const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
      const sList = (sts ?? []).map((s: any) => ({ id: s.id, student_id: s.student_id, full_name: pMap.get(s.user_id) ?? "—" }));
      setStudents(sList);

      const { data: existing } = await supabase.from("exam_results").select("*")
        .eq("exam_id", examId).eq("subject_id", current.subject_id);
      const m: any = {};
      sList.forEach(s => {
        const e = (existing ?? []).find((r: any) => r.student_id === s.id);
        m[s.id] = {
          marks_obtained: e ? String(e.marks_obtained) : "",
          max_marks: e ? String(e.max_marks) : "100",
          grade: e?.grade ?? "",
          remarks: e?.remarks ?? "",
          id: e?.id,
        };
      });
      setMarks(m);
      setLoading(false);
    };
    load();
  }, [examId, selectedAssignment]);

  const save = async () => {
    if (!current || !examId) return;
    setSaving(true);
    const rows: any[] = [];
    for (const s of students) {
      const m = marks[s.id];
      if (!m || m.marks_obtained === "") continue;
      const obtained = parseFloat(m.marks_obtained);
      const max = parseFloat(m.max_marks || "100");
      if (isNaN(obtained) || isNaN(max)) continue;
      rows.push({
        id: m.id,
        exam_id: examId,
        student_id: s.id,
        subject_id: current.subject_id,
        marks_obtained: obtained,
        max_marks: max,
        grade: m.grade || null,
        remarks: m.remarks || null,
      });
    }
    if (!rows.length) { setSaving(false); return toast.error("No marks entered"); }
    // separate inserts / updates
    const toInsert = rows.filter(r => !r.id).map(({ id, ...rest }) => rest);
    const toUpdate = rows.filter(r => r.id);
    let ok = true;
    if (toInsert.length) {
      const { error } = await supabase.from("exam_results").insert(toInsert);
      if (error) { toast.error(error.message); ok = false; }
    }
    for (const u of toUpdate) {
      const { id, ...rest } = u;
      const { error } = await supabase.from("exam_results").update(rest).eq("id", id);
      if (error) { toast.error(error.message); ok = false; }
    }
    setSaving(false);
    if (ok) {
      toast.success("Marks saved");
      // reload
      setExamId(prev => prev);
      const e = examId; setExamId(""); setTimeout(() => setExamId(e), 0);
    }
  };

  if (!teacherId) return <Card><CardContent className="p-6">You are not registered as a teacher.</CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ClipboardEdit className="h-5 w-5" /> Enter Marks</CardTitle>
        <CardDescription>Enter marks only for the classes and subjects assigned to you.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {assignments.length === 0 ? (
          <p className="text-muted-foreground">You have no class/subject assignments yet. Ask the admin to assign you.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Class / Subject</Label>
              <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
                <SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger>
                <SelectContent>
                  {assignments.map(a => (
                    <SelectItem key={`${a.class_id}::${a.subject_id}`} value={`${a.class_id}::${a.subject_id}`}>
                      {a.class_name} — {a.subject_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Exam</Label>
              <Select value={examId} onValueChange={setExamId} disabled={!current}>
                <SelectTrigger><SelectValue placeholder="Choose exam..." /></SelectTrigger>
                <SelectContent>
                  {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {current && examId && (
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead className="w-28">Marks</TableHead>
                    <TableHead className="w-24">Out of</TableHead>
                    <TableHead className="w-20">Grade</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow>
                    : students.length === 0 ? <TableRow><TableCell colSpan={6}>No students in this class</TableCell></TableRow>
                    : students.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell>{s.student_id}</TableCell>
                      <TableCell><Input type="number" value={marks[s.id]?.marks_obtained ?? ""} onChange={e => setMarks({ ...marks, [s.id]: { ...marks[s.id], marks_obtained: e.target.value } })} /></TableCell>
                      <TableCell><Input type="number" value={marks[s.id]?.max_marks ?? "100"} onChange={e => setMarks({ ...marks, [s.id]: { ...marks[s.id], max_marks: e.target.value } })} /></TableCell>
                      <TableCell><Input value={marks[s.id]?.grade ?? ""} onChange={e => setMarks({ ...marks, [s.id]: { ...marks[s.id], grade: e.target.value } })} /></TableCell>
                      <TableCell><Input value={marks[s.id]?.remarks ?? ""} onChange={e => setMarks({ ...marks, [s.id]: { ...marks[s.id], remarks: e.target.value } })} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Marks"}</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MarksEntry;
