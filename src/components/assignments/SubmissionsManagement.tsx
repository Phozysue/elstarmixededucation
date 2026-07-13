import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Save } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { extractStoragePath } from "@/lib/storagePaths";

// file_url stores the storage PATH; we sign on demand to avoid expiry
const openSignedUrl = async (path: string) => {
  const storagePath = extractStoragePath(path, "assignment-files");
  const { data, error } = await supabase.storage
    .from("assignment-files")
    .createSignedUrl(storagePath, 60 * 5); // 5 min, fresh on every click
  if (error || !data?.signedUrl) {
    toast.error("Could not open file: " + (error?.message || "unknown error"));
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
};

interface SubmissionRow {
  id: string;
  assignment_id: string;
  student_id: string;
  file_url: string | null;
  submission_text: string | null;
  submitted_at: string;
  marks_obtained: number | null;
  feedback: string | null;
  graded_at: string | null;
  assignment_title: string;
  max_marks: number;
  student_code: string;
  student_name: string;
}

const SubmissionsManagement = () => {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAssignment, setFilterAssignment] = useState<string>("all");
  const [edits, setEdits] = useState<Record<string, { marks: string; feedback: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: subs, error } = await supabase
        .from("assignment_submissions")
        .select(
          `id, assignment_id, student_id, file_url, submission_text, submitted_at,
           marks_obtained, feedback, graded_at,
           assignments (title, max_marks),
           students (student_id, user_id)`
        )
        .order("submitted_at", { ascending: false });

      if (error) throw error;

      const userIds = Array.from(
        new Set((subs || []).map((s: any) => s.students?.user_id).filter(Boolean))
      );

      let profilesMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        profilesMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));
      }

      const formatted: SubmissionRow[] = (subs || []).map((s: any) => ({
        id: s.id,
        assignment_id: s.assignment_id,
        student_id: s.student_id,
        file_url: s.file_url,
        submission_text: s.submission_text,
        submitted_at: s.submitted_at,
        marks_obtained: s.marks_obtained,
        feedback: s.feedback,
        graded_at: s.graded_at,
        assignment_title: s.assignments?.title || "Unknown",
        max_marks: s.assignments?.max_marks || 100,
        student_code: s.students?.student_id || "—",
        student_name: profilesMap.get(s.students?.user_id) || "Unknown student",
      }));

      setRows(formatted);
      const initialEdits: Record<string, { marks: string; feedback: string }> = {};
      formatted.forEach((r) => {
        initialEdits[r.id] = {
          marks: r.marks_obtained?.toString() ?? "",
          feedback: r.feedback ?? "",
        };
      });
      setEdits(initialEdits);
    } catch (err: any) {
      toast.error("Failed to load submissions: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("submissions-mgmt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assignment_submissions" },
        () => fetchData()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const assignments = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => map.set(r.assignment_id, r.assignment_title));
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [rows]);

  const visibleRows = useMemo(() => {
    if (filterAssignment === "all") return rows;
    return rows.filter((r) => r.assignment_id === filterAssignment);
  }, [rows, filterAssignment]);

  const handleSave = async (row: SubmissionRow) => {
    const edit = edits[row.id];
    const marksNum = edit.marks === "" ? null : Number(edit.marks);
    if (marksNum !== null && (Number.isNaN(marksNum) || marksNum < 0 || marksNum > row.max_marks)) {
      toast.error(`Marks must be between 0 and ${row.max_marks}`);
      return;
    }

    setSavingId(row.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("assignment_submissions")
        .update({
          marks_obtained: marksNum,
          feedback: edit.feedback.trim() || null,
          graded_by: user?.id ?? null,
          graded_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (error) throw error;
      logAudit({
        action: "submission.graded",
        entity_type: "assignment_submission",
        entity_id: row.id,
        metadata: {
          assignment_id: row.assignment_id,
          student_id: row.student_id,
          marks_obtained: marksNum,
          max_marks: row.max_marks,
        },
      });
      toast.success("Grade saved!");
    } catch (err: any) {
      toast.error("Failed to save grade: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Submissions</CardTitle>
        <CardDescription>Review uploaded work and assign grades.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-sm">
          <Label>Filter by assignment</Label>
          <Select value={filterAssignment} onValueChange={setFilterAssignment}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignments</SelectItem>
              {assignments.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {visibleRows.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No submissions yet.</p>
        ) : (
          <div className="space-y-4">
            {visibleRows.map((row) => (
              <Card key={row.id} className="border-l-4 border-l-primary">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{row.assignment_title}</div>
                      <div className="text-sm text-muted-foreground">
                        {row.student_name} · {row.student_code}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Submitted {new Date(row.submitted_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {row.marks_obtained !== null && (
                        <Badge>
                          {row.marks_obtained} / {row.max_marks}
                        </Badge>
                      )}
                      {row.file_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openSignedUrl(row.file_url!)}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open file
                        </Button>
                      )}
                    </div>
                  </div>

                  {row.submission_text && (
                    <div className="rounded-md bg-muted/40 p-3 text-sm">
                      <span className="font-medium">Student note: </span>
                      {row.submission_text}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_auto] gap-3 items-end">
                    <div className="space-y-1">
                      <Label>Marks (out of {row.max_marks})</Label>
                      <Input
                        type="number"
                        min={0}
                        max={row.max_marks}
                        value={edits[row.id]?.marks ?? ""}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [row.id]: { ...prev[row.id], marks: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Feedback</Label>
                      <Textarea
                        rows={2}
                        value={edits[row.id]?.feedback ?? ""}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [row.id]: { ...prev[row.id], feedback: e.target.value },
                          }))
                        }
                        placeholder="Optional feedback for the student"
                      />
                    </div>
                    <Button onClick={() => handleSave(row)} disabled={savingId === row.id}>
                      <Save className="h-4 w-4 mr-2" />
                      {savingId === row.id ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SubmissionsManagement;
