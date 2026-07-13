import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";

type Status = "present" | "absent" | "late";

interface ClassRow {
  id: string;
  name: string;
  section: string | null;
  academic_year: string;
}

interface StudentRow {
  id: string;
  student_id: string;
  user_id: string;
  full_name?: string;
}

interface AttendanceState {
  status: Status;
  remarks: string;
  existingId?: string;
}

interface TermRow {
  id: string;
  name: string;
  academic_year: string;
  start_date: string;
  end_date: string;
}

const AttendanceManagement = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [termId, setTermId] = useState<string>("");
  const [classId, setClassId] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [records, setRecords] = useState<Record<string, AttendanceState>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const dateStr = useMemo(() => format(date, "yyyy-MM-dd"), [date]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Only classes where the current user is the assigned class teacher
      const { data: teacherRow } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!teacherRow) {
        setClasses([]);
        return;
      }

      const { data, error } = await supabase
        .from("classes")
        .select("id, name, section, academic_year")
        .eq("class_teacher_id", teacherRow.id)
        .order("grade_level");
      if (error) {
        toast.error("Failed to load classes");
        return;
      }
      setClasses(data ?? []);
    })();
    (async () => {
      const { data } = await supabase
        .from("academic_terms")
        .select("*")
        .order("start_date", { ascending: false });
      setTerms(data ?? []);
    })();
  }, [user]);

  const activeTerm = terms.find((t) => t.id === termId);

  useEffect(() => {
    if (!classId) {
      setStudents([]);
      setRecords({});
      return;
    }
    loadRoster();
  }, [classId, dateStr]);

  const loadRoster = async () => {
    setLoading(true);
    try {
      const { data: studs, error: sErr } = await supabase
        .from("students")
        .select("id, student_id, user_id")
        .eq("class_id", classId)
        .order("student_id");
      if (sErr) throw sErr;

      const userIds = (studs ?? []).map((s) => s.user_id);
      let nameMap: Record<string, string> = {};
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        nameMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));
      }

      const enriched: StudentRow[] = (studs ?? []).map((s) => ({
        ...s,
        full_name: nameMap[s.user_id] ?? "Unknown",
      }));
      setStudents(enriched);

      const studentIds = enriched.map((s) => s.id);
      let existing: Record<string, AttendanceState> = {};
      if (studentIds.length) {
        const { data: att, error: aErr } = await supabase
          .from("attendance")
          .select("id, student_id, status, remarks")
          .eq("class_id", classId)
          .eq("date", dateStr)
          .in("student_id", studentIds);
        if (aErr) throw aErr;
        existing = Object.fromEntries(
          (att ?? []).map((a) => [
            a.student_id,
            { status: a.status as Status, remarks: a.remarks ?? "", existingId: a.id },
          ]),
        );
      }

      // default unmarked students to "present"
      const initial: Record<string, AttendanceState> = {};
      for (const s of enriched) {
        initial[s.id] = existing[s.id] ?? { status: "present", remarks: "" };
      }
      setRecords(initial);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  const setStatus = (studentId: string, status: Status) => {
    setRecords((prev) => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
  };

  const setRemarks = (studentId: string, remarks: string) => {
    setRecords((prev) => ({ ...prev, [studentId]: { ...prev[studentId], remarks } }));
  };

  const markAll = (status: Status) => {
    setRecords((prev) => {
      const next: Record<string, AttendanceState> = {};
      for (const [k, v] of Object.entries(prev)) next[k] = { ...v, status };
      return next;
    });
  };

  const handleSave = async () => {
    if (!user || !classId || students.length === 0) return;
    if (!termId) return toast.error("Select a term first");
    const day = date.getDay(); // 0=Sun, 6=Sat
    if (day === 0 || day === 6) return toast.error("Attendance can only be marked Monday–Friday");
    if (activeTerm && (dateStr < activeTerm.start_date || dateStr > activeTerm.end_date)) {
      return toast.error("Date is outside the selected term");
    }
    setSaving(true);
    try {
      const rows = students.map((s) => ({
        student_id: s.id,
        class_id: classId,
        date: dateStr,
        status: records[s.id]?.status ?? "present",
        remarks: records[s.id]?.remarks?.trim() || null,
        marked_by: user.id,
        term_id: termId,
      }));

      const { error } = await supabase
        .from("attendance")
        .upsert(rows, { onConflict: "student_id,date,class_id" });
      if (error) throw error;

      const counts = rows.reduce(
        (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
        {} as Record<string, number>,
      );

      logAudit({
        action: "attendance.marked",
        entity_type: "attendance",
        entity_id: `${classId}:${dateStr}`,
        metadata: { class_id: classId, date: dateStr, total: rows.length, ...counts },
      });

      toast.success(`Attendance saved for ${rows.length} students`);
      loadRoster();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to save attendance";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance</CardTitle>
        <CardDescription>
          Mark daily attendance for classes you are assigned to as the class teacher. Weekdays only (Mon–Fri).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Term</Label>
            <Select value={termId} onValueChange={setTermId}>
              <SelectTrigger><SelectValue placeholder="Select a term" /></SelectTrigger>
              <SelectContent>
                {terms.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">No terms yet — ask admin to add.</div>
                ) : terms.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.academic_year})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.section ? ` - ${c.section}` : ""} ({c.academic_year})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  disabled={(d) => {
                    if (d > new Date()) return true;
                    const day = d.getDay();
                    if (day === 0 || day === 6) return true;
                    if (activeTerm) {
                      const ds = format(d, "yyyy-MM-dd");
                      if (ds < activeTerm.start_date || ds > activeTerm.end_date) return true;
                    }
                    return false;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Quick actions</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => markAll("present")} disabled={!students.length}>
                All Present
              </Button>
              <Button variant="outline" size="sm" onClick={() => markAll("absent")} disabled={!students.length}>
                All Absent
              </Button>
            </div>
          </div>
        </div>

        {!classId ? (
          <p className="text-muted-foreground text-sm">Select a class to begin.</p>
        ) : loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : students.length === 0 ? (
          <p className="text-muted-foreground text-sm">No students enrolled in this class.</p>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => {
                    const r = records[s.id];
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.student_id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {s.full_name}
                            {r?.existingId && (
                              <Badge variant="secondary" className="text-xs">
                                Saved
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <RadioGroup
                            value={r?.status ?? "present"}
                            onValueChange={(v) => setStatus(s.id, v as Status)}
                            className="flex gap-3"
                          >
                            <div className="flex items-center gap-1">
                              <RadioGroupItem id={`p-${s.id}`} value="present" />
                              <Label htmlFor={`p-${s.id}`} className="text-xs cursor-pointer">P</Label>
                            </div>
                            <div className="flex items-center gap-1">
                              <RadioGroupItem id={`a-${s.id}`} value="absent" />
                              <Label htmlFor={`a-${s.id}`} className="text-xs cursor-pointer">A</Label>
                            </div>
                            <div className="flex items-center gap-1">
                              <RadioGroupItem id={`l-${s.id}`} value="late" />
                              <Label htmlFor={`l-${s.id}`} className="text-xs cursor-pointer">L</Label>
                            </div>
                          </RadioGroup>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={r?.remarks ?? ""}
                            onChange={(e) => setRemarks(s.id, e.target.value)}
                            placeholder="Optional"
                            className="h-8"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Attendance
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceManagement;
