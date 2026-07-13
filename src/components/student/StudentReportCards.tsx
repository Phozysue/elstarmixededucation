import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { toast } from "sonner";

const StudentReportCards = ({ studentId }: { studentId: string }) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from("report_cards").select("*").eq("student_id", studentId).order("academic_year", { ascending: false }).order("term");
      setReports(data ?? []);
      setLoading(false);
    };
    load();
  }, [studentId]);

  const download = async (path: string) => {
    const { data, error } = await supabase.storage.from("report-cards").createSignedUrl(path, 300);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Report Cards</CardTitle>
        <CardDescription>Your term report cards uploaded by your class teacher</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Year</TableHead><TableHead>Term</TableHead><TableHead>Remarks</TableHead><TableHead className="text-right">Report</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={4}>Loading...</TableCell></TableRow>
                : reports.length === 0 ? <TableRow><TableCell colSpan={4}>No report cards yet</TableCell></TableRow>
                : reports.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.academic_year}</TableCell>
                    <TableCell className="font-medium">{r.term}</TableCell>
                    <TableCell className="max-w-md">{r.remarks ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {r.pdf_path ? (
                        <Button size="sm" variant="outline" onClick={() => download(r.pdf_path)}>
                          <Download className="h-3 w-3 mr-1" />Download
                        </Button>
                      ) : <span className="text-muted-foreground text-sm">No file</span>}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentReportCards;
