import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Award } from "lucide-react";

const StudentResults = ({ studentId }: { studentId: string }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from("exam_results")
        .select("id, marks_obtained, max_marks, grade, remarks, exams(name, exam_type, start_date), subjects(name, code)")
        .eq("student_id", studentId);
      const sorted = (data ?? []).sort((a: any, b: any) => (b.exams?.start_date ?? "").localeCompare(a.exams?.start_date ?? ""));
      setRows(sorted);
      setLoading(false);
    };
    load();
  }, [studentId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" /> My Exam Results</CardTitle>
        <CardDescription>All marks recorded by your subject teachers</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Exam</TableHead><TableHead>Subject</TableHead><TableHead>Marks</TableHead><TableHead>Percent</TableHead><TableHead>Grade</TableHead><TableHead>Remarks</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow>
                : rows.length === 0 ? <TableRow><TableCell colSpan={6}>No results yet</TableCell></TableRow>
                : rows.map(r => {
                  const pct = r.max_marks > 0 ? (Number(r.marks_obtained) / Number(r.max_marks)) * 100 : 0;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{r.exams?.name ?? "—"}</TableCell>
                      <TableCell className="font-medium">{r.subjects?.name ?? "—"}</TableCell>
                      <TableCell>{Number(r.marks_obtained)} / {Number(r.max_marks)}</TableCell>
                      <TableCell>{pct.toFixed(1)}%</TableCell>
                      <TableCell>{r.grade ?? "—"}</TableCell>
                      <TableCell>{r.remarks ?? "—"}</TableCell>
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

export default StudentResults;
