import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, CheckCircle2, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Submission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string | null;
  created_at: string;
}

const ContactSubmissionsViewer = () => {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "read">("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    const { error } = await supabase.from("contact_submissions").update({ status: "read" }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    const { error } = await supabase.from("contact_submissions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const filtered = items.filter((i) => filter === "all" ? true : (i.status || "pending") === filter);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Contact Messages</CardTitle>
        <div className="flex gap-2">
          {(["all", "pending", "read"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">No messages.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => {
              const status = s.status || "pending";
              return (
                <div key={s.id} className="border rounded-md p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="font-semibold">{s.subject}</div>
                      <div className="text-sm text-muted-foreground">
                        From <span className="font-medium">{s.name}</span> &lt;{s.email}&gt;
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(s.created_at), "PPp")}
                      </div>
                    </div>
                    <Badge variant={status === "read" ? "secondary" : "default"}>{status}</Badge>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{s.message}</p>
                  <div className="flex gap-2 pt-2">
                    {status !== "read" && (
                      <Button size="sm" variant="outline" onClick={() => markRead(s.id)}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Mark as read
                      </Button>
                    )}
                    <Button size="sm" variant="outline" asChild>
                      <a href={`mailto:${s.email}?subject=Re: ${encodeURIComponent(s.subject)}`}>Reply</a>
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContactSubmissionsViewer;
