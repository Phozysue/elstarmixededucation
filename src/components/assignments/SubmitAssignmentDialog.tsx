import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface SubmitAssignmentDialogProps {
  assignmentId: string;
  assignmentTitle: string;
  studentId: string;
  dueDate?: string | null;
  /** Optional: parent-supplied existing submission to seed the dialog (saves a fetch). */
  existingSubmission?: ExistingSubmission | null;
  /** Called after a successful submit/resubmit so parent can refresh. */
  onSubmitted?: () => void;
}

export interface ExistingSubmission {
  id: string;
  file_url: string | null;
  submission_text: string | null;
  submitted_at: string;
  marks_obtained: number | null;
  feedback: string | null;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const SubmitAssignmentDialog = ({
  assignmentId,
  assignmentTitle,
  studentId,
  dueDate,
  existingSubmission,
  onSubmitted,
}: SubmitAssignmentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<ExistingSubmission | null>(existingSubmission ?? null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const isOverdue = !!dueDate && new Date(dueDate) < new Date();
  const isGraded = existing?.marks_obtained !== null && existing?.marks_obtained !== undefined;

  useEffect(() => {
    if (!open) return;
    // If parent already provided it, just sync local form state
    if (existingSubmission !== undefined) {
      setExisting(existingSubmission);
      setSubmissionText(existingSubmission?.submission_text || "");
      return;
    }
    const load = async () => {
      setLoadingExisting(true);
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("id, file_url, submission_text, submitted_at, marks_obtained, feedback")
        .eq("assignment_id", assignmentId)
        .eq("student_id", studentId)
        .maybeSingle();
      if (!error && data) {
        setExisting(data);
        setSubmissionText(data.submission_text || "");
      } else {
        setExisting(null);
      }
      setLoadingExisting(false);
    };
    load();
  }, [open, assignmentId, studentId, existingSubmission]);

  const handleSubmit = async () => {
    if (isOverdue) {
      toast.error("Deadline has passed. Submissions are closed.");
      return;
    }
    if (!file && !submissionText.trim()) {
      toast.error("Please attach a file or write a comment.");
      return;
    }
    if (file && file.size > MAX_FILE_SIZE) {
      toast.error("File is larger than 20MB.");
      return;
    }

    setSubmitting(true);
    try {
      // We store the storage PATH (not a signed URL) so links never expire.
      let file_path: string | null = existing?.file_url ?? null;

      if (file) {
        const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
        const path = `${studentId}/${assignmentId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("assignment-files")
          .upload(path, file, { upsert: true, contentType: file.type });
        if (uploadError) throw uploadError;
        file_path = path;
      }

      if (existing) {
        const { error } = await supabase
          .from("assignment_submissions")
          .update({
            file_url: file_path,
            submission_text: submissionText.trim() || null,
            submitted_at: new Date().toISOString(),
            // Reset grade on resubmit
            marks_obtained: null,
            feedback: null,
            graded_by: null,
            graded_at: null,
          })
          .eq("id", existing.id);
        if (error) throw error;
        toast.success("Submission updated!");
      } else {
        const { error } = await supabase.from("assignment_submissions").insert({
          assignment_id: assignmentId,
          student_id: studentId,
          file_url: file_path,
          submission_text: submissionText.trim() || null,
        });
        if (error) {
          // Friendly message for duplicate (race condition catcher)
          if (error.code === "23505") {
            toast.error("You already have a submission for this assignment. Reopen the dialog to resubmit.");
          } else {
            throw error;
          }
          return;
        }
        toast.success("Assignment submitted!");
      }

      setFile(null);
      setOpen(false);
      onSubmitted?.();
    } catch (err: any) {
      toast.error("Submission failed: " + (err.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={isOverdue && !existing} variant={existing ? "outline" : "default"}>
          <Upload className="h-4 w-4 mr-2" />
          {existing ? "Resubmit" : "Submit"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit: {assignmentTitle}</DialogTitle>
          <DialogDescription>
            Upload your work and/or write a short comment for your teacher.
          </DialogDescription>
        </DialogHeader>

        {loadingExisting ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-4">
            {isOverdue && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  Deadline has passed ({new Date(dueDate!).toLocaleString()}). New submissions are closed.
                </div>
              </div>
            )}

            {existing && (
              <div className="rounded-md border p-3 space-y-2 bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Submitted on {new Date(existing.submitted_at).toLocaleString()}
                </div>
                {isGraded && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>Graded: {existing.marks_obtained}</Badge>
                    {existing.feedback && (
                      <span className="text-sm text-muted-foreground">
                        "{existing.feedback}"
                      </span>
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Submitting again will replace your previous file and reset any grade.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="file">File (optional, max 20MB)</Label>
              <Input
                id="file"
                type="file"
                disabled={isOverdue}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Comment (optional)</Label>
              <Textarea
                id="comment"
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                placeholder="e.g. I had trouble with question 3..."
                rows={4}
                disabled={isOverdue}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || loadingExisting || isOverdue}>
            {submitting ? "Submitting..." : existing ? "Resubmit" : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubmitAssignmentDialog;
