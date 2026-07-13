import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { FileText, Upload, Download, Trash2 } from "lucide-react";

interface ClassRow { id: string; name: string; }
interface Student { id: string; student_id: string; full_name: string; }
interface TermRow { id: string; name: string; academic_year: string; start_date: string; end_date: string; }
interface Report {
  id: string; student_id: string; term: string; academic_year: string;
  pdf_path: string | null; remarks: string | null; updated_at: string;
}

const ReportCardsManagement = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [termId, setTermId] = useState<string>("");
  const [classId, setClassId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [reports, setReports] = useState<Record<string, Report | undefined>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);

  const activeTerm = terms.find((t) => t.id === termId);
  const term = activeTerm?.name ?? "";
  const year = activeTerm?.academic_year ?? "";
  const today = new Date().toISOString().slice(0, 10);
  const termEnded = activeTerm ? today >= activeTerm.end_date : false;

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data: t } = await supabase.from("teachers").select("id").eq("user_id", user.id).maybeSingle();
      if (!t) { setClasses([]); return; }
      const { data: cls } = await supabase.from("classes").select("id, name").eq("class_teacher_id", t.id);
      setClasses(cls ?? []);
      if (cls && cls.length && !classId) setClassId(cls[0].id);
    };
    load();
    (async () => {
      const { data } = await supabase.from("academic_terms").select("*").order("start_date", { ascending: false });
      setTerms(data ?? []);
      if (data && data.length && !termId) setTermId(data[0].id);
    })();
  }, [user]);

  const refresh = async () => {
    if (!classId) return;
    const { data: sts } = await supabase.from("students").select("id, student_id, user_id").eq("class_id", classId);
    const userIds = (sts ?? []).map((s: any) => s.user_id);
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
    const list = (sts ?? []).map((s: any) => ({ id: s.id, student_id: s.student_id, full_name: pMap.get(s.user_id) ?? "—" }));
    setStudents(list);

    const { data: rc } = await supabase.from("report_cards").select("*")
      .eq("class_id", classId).eq("term", term).eq("academic_year", year);
    const rMap: Record<string, Report> = {};
    const rem: Record<string, string> = {};
    (rc ?? []).forEach((r: any) => { rMap[r.student_id] = r; rem[r.student_id] = r.remarks ?? ""; });
    setReports(rMap);
    setRemarks(rem);
  };

  useEffect(() => { if (term && year) refresh(); }, [classId, term, year]);

  const upsertRemarks = async (studentId: string) => {
    if (!activeTerm) return toast.error("Select a term");
    const existing = reports[studentId];
    const payload = {
      student_id: studentId, class_id: classId, term, academic_year: year,
      term_id: activeTerm.id,
      remarks: remarks[studentId] || null,
      uploaded_by: user?.id ?? null,
      pdf_path: existing?.pdf_path ?? null,
    };
    const { error } = await supabase.from("report_cards").upsert(payload, { onConflict: "student_id,term,academic_year" });
    if (error) return toast.error(error.message);
    toast.success("Remarks saved");
    refresh();
  };

  const uploadPdf = async (student: Student, file: File) => {
    if (!activeTerm) return toast.error("Select a term");
    if (!termEnded) return toast.error(`Report cards can only be uploaded after the term ends (${activeTerm.end_date})`);
    if (file.type !== "application/pdf") return toast.error("PDF only");
    if (file.size > 20 * 1024 * 1024) return toast.error("Max 20MB");
    setUploading(student.id);
    const path = `${classId}/${student.id}/${term}-${year}-${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage.from("report-cards").upload(path, file, { upsert: true, contentType: "application/pdf" });
    if (upErr) { setUploading(null); return toast.error(upErr.message); }
    const prev = reports[student.id]?.pdf_path;
    if (prev && prev !== path) await supabase.storage.from("report-cards").remove([prev]);
    const { error } = await supabase.from("report_cards").upsert({
      student_id: student.id, class_id: classId, term, academic_year: year,
      term_id: activeTerm.id,
      pdf_path: path, remarks: remarks[student.id] || null,
      uploaded_by: user?.id ?? null,
    }, { onConflict: "student_id,term,academic_year" });
    setUploading(null);
    if (error) return toast.error(error.message);
    toast.success("Report uploaded");
    refresh();
  };

  const download = async (path: string) => {
    const { data, error } = await supabase.storage.from("report-cards").createSignedUrl(path, 300);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const removeReport = async (r: Report) => {
    if (!confirm("Delete this report card?")) return;
    if (r.pdf_path) await supabase.storage.from("report-cards").remove([r.pdf_path]);
    const { error } = await supabase.from("report_cards").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    refresh();
  };

  if (!classes.length) {
    return <Card><CardContent className="p-6">You are not assigned as a class teacher. Ask admin to assign you.</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Report Cards</CardTitle>
        <CardDescription>Upload PDF report cards and enter remarks for students in your class.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Term</Label>
            <Select value={termId} onValueChange={setTermId}>
              <SelectTrigger><SelectValue placeholder="Select a term" /></SelectTrigger>
              <SelectContent>
                {terms.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">No terms yet — ask admin to add.</div>
                ) : terms.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.academic_year}) — ends {t.end_date}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {activeTerm && !termEnded && (
          <p className="text-sm text-muted-foreground">Uploads unlock after the term ends on <strong>{activeTerm.end_date}</strong>. Remarks can be entered anytime.</p>
        )}

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>PDF</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? <TableRow><TableCell colSpan={4}>No students</TableCell></TableRow>
                : students.map(s => {
                  const r = reports[s.id];
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.full_name} <span className="text-muted-foreground text-xs">({s.student_id})</span></TableCell>
                      <TableCell>
                        {r?.pdf_path ? (
                          <Button size="sm" variant="outline" onClick={() => download(r.pdf_path!)}><Download className="h-3 w-3 mr-1" />View</Button>
                        ) : <span className="text-muted-foreground text-sm">None</span>}
                      </TableCell>
                      <TableCell>
                        <Textarea rows={2} value={remarks[s.id] ?? ""} onChange={e => setRemarks({ ...remarks, [s.id]: e.target.value })} placeholder="Remarks..." />
                      </TableCell>
                      <TableCell className="text-right space-y-2">
                        <div>
                          <input id={`f-${s.id}`} type="file" accept="application/pdf" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadPdf(s, f); e.target.value = ""; }} />
                          <Button size="sm" variant="outline" disabled={uploading === s.id || !termEnded}
                            onClick={() => document.getElementById(`f-${s.id}`)?.click()}>
                            <Upload className="h-3 w-3 mr-1" />{uploading === s.id ? "Uploading..." : (r?.pdf_path ? "Replace" : "Upload")}
                          </Button>
                        </div>
                        <div className="space-x-2">
                          <Button size="sm" onClick={() => upsertRemarks(s.id)}>Save</Button>
                          {r && <Button size="sm" variant="ghost" onClick={() => removeReport(r)}><Trash2 className="h-3 w-3" /></Button>}
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

export default ReportCardsManagement;
