import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle2, Clock, Award } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SubmitAssignmentDialog, { ExistingSubmission } from "./SubmitAssignmentDialog";
import { extractStoragePath } from "@/lib/storagePaths";

interface AssignmentCardProps {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  max_marks: number;
  file_url: string | null;
  class_name: string;
  subject_name: string;
  studentId?: string; // when present, show Submit button + status
}

const AssignmentCard = ({
  id,
  title,
  description,
  due_date,
  max_marks,
  file_url,
  class_name,
  subject_name,
  studentId,
}: AssignmentCardProps) => {
  const isOverdue = due_date && new Date(due_date) < new Date();
  const [submission, setSubmission] = useState<ExistingSubmission | null>(null);
  const [loadingSubmission, setLoadingSubmission] = useState(false);

  const loadSubmission = async () => {
    if (!studentId) return;
    setLoadingSubmission(true);
    const { data } = await supabase
      .from("assignment_submissions")
      .select("id, file_url, submission_text, submitted_at, marks_obtained, feedback")
      .eq("assignment_id", id)
      .eq("student_id", studentId)
      .maybeSingle();
    setSubmission(data ?? null);
    setLoadingSubmission(false);
  };

  useEffect(() => {
    loadSubmission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, studentId]);

  const friendlyError = (status?: number, message?: string) => {
    if (status === 404) return "The file couldn't be found on the server. It may have been removed by your teacher.";
    if (status === 403 || status === 401) return "You don't have permission to download this file. Please contact your teacher.";
    if (status && status >= 500) return "The server is having trouble right now. Please try again in a moment.";
    if (message && /network|failed to fetch|load failed/i.test(message))
      return "Network problem — please check your internet connection and try again.";
    return "We couldn't download the file. Please try again.";
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const attemptDownload = async (storagePath: string) => {
    const { data: signed, error: signErr } = await supabase.storage
      .from("assignment-files")
      .createSignedUrl(storagePath, 60 * 10);
    if (signErr || !signed?.signedUrl) {
      const err: any = new Error(signErr?.message || "Could not prepare download link");
      err.status = (signErr as any)?.status;
      throw err;
    }
    const response = await fetch(signed.signedUrl);
    if (!response.ok) {
      const err: any = new Error(`HTTP ${response.status}`);
      err.status = response.status;
      throw err;
    }
    return { blob: await response.blob() };
  };

  const handleDownload = async () => {
    if (!file_url) return;

    // file_url may be a full legacy URL or a storage path.
    const storagePath = extractStoragePath(file_url, "assignment-files");

    const MAX_ATTEMPTS = 3;
    let lastErr: any = null;
    const loadingToast = toast.loading("Preparing download...");

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        if (attempt > 1) {
          toast.loading(`Retrying download (attempt ${attempt} of ${MAX_ATTEMPTS})...`, { id: loadingToast });
        }
        const { blob } = await attemptDownload(storagePath);

        const ext = storagePath.includes(".") ? storagePath.split(".").pop() : "pdf";
        const safeTitle = title.replace(/[^a-zA-Z0-9-_ ]/g, "_").trim() || "assignment";
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `${safeTitle}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        toast.success("Download started!", { id: loadingToast });
        return;
      } catch (err: any) {
        lastErr = err;
        // Don't retry on auth/not-found — retry won't help
        if (err?.status === 404 || err?.status === 403 || err?.status === 401) break;
        if (attempt < MAX_ATTEMPTS) await sleep(600 * attempt);
      }
    }

    toast.error(friendlyError(lastErr?.status, lastErr?.message), {
      id: loadingToast,
      description: "If this keeps happening, please let your teacher know.",
      action: {
        label: "Try again",
        onClick: () => handleDownload(),
      },
    });
  };

  // Status badge for student view
  const renderStatusBadge = () => {
    if (!studentId || loadingSubmission) return null;
    if (!submission) {
      return (
        <Badge variant="outline" className="border-destructive/40 text-destructive">
          Not submitted
        </Badge>
      );
    }
    if (submission.marks_obtained !== null && submission.marks_obtained !== undefined) {
      return (
        <Badge className="bg-primary">
          <Award className="h-3 w-3 mr-1" />
          Graded · {submission.marks_obtained}/{max_marks}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Submitted · awaiting grade
      </Badge>
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg line-clamp-1">{title}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{subject_name}</Badge>
              <Badge variant="outline">{class_name}</Badge>
              {renderStatusBadge()}
            </div>
          </div>
          <Badge variant={isOverdue ? "destructive" : "default"}>{max_marks} marks</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        )}

        {/* Inline grade & feedback so students don't need to open a dialog */}
        {studentId && submission?.marks_obtained !== null && submission?.marks_obtained !== undefined && (
          <div className="rounded-md bg-muted/40 p-3 text-sm space-y-1">
            <div className="font-medium">
              Grade: {submission.marks_obtained} / {max_marks}
            </div>
            {submission.feedback && (
              <div className="text-muted-foreground">Feedback: "{submission.feedback}"</div>
            )}
          </div>
        )}

        {studentId && submission && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last submitted {new Date(submission.submitted_at).toLocaleString()}
          </p>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className={`text-sm ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
            {due_date ? `Due: ${new Date(due_date).toLocaleDateString()}` : "No due date"}
            {isOverdue && " (overdue)"}
          </p>
          <div className="flex items-center gap-2">
            {file_url && (
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
            {studentId && (
              <SubmitAssignmentDialog
                assignmentId={id}
                assignmentTitle={title}
                studentId={studentId}
                dueDate={due_date}
                existingSubmission={submission}
                onSubmitted={loadSubmission}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssignmentCard;
