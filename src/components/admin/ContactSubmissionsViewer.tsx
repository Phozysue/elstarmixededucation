import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Mail,
  CheckCircle2,
  Trash2,
  Search,
  Phone,
  Reply,
  MessageCircle,
  Send,
} from "lucide-react";
import { format } from "date-fns";

interface Submission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string | null;
  created_at: string;
}

type Filter = "all" | "pending" | "read" | "responded";

const ContactSubmissionsViewer = () => {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [replyTo, setReplyTo] = useState<Submission | null>(null);
  const [replyBody, setReplyBody] = useState("");

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

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("contact_submissions")
      .update({ status })
      .eq("id", id);
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

  const openReply = (s: Submission) => {
    setReplyTo(s);
    setReplyBody(
      `Dear ${s.name},\n\nThank you for contacting Elstar Mixed Education Centre.\n\n\n\nKind regards,\nElstar Mixed Education Centre`
    );
  };

  const sendEmailReply = async () => {
    if (!replyTo) return;
    if (!replyBody.trim()) return toast.error("Write a reply first");
    const href = `mailto:${replyTo.email}?subject=${encodeURIComponent(
      `Re: ${replyTo.subject}`
    )}&body=${encodeURIComponent(replyBody)}`;
    window.location.href = href;
    await setStatus(replyTo.id, "responded");
    setReplyTo(null);
  };

  const sendWhatsAppReply = async () => {
    if (!replyTo?.phone) return;
    if (!replyBody.trim()) return toast.error("Write a reply first");
    const digits = replyTo.phone.replace(/\D/g, "");
    window.open(
      `https://wa.me/${digits}?text=${encodeURIComponent(replyBody)}`,
      "_blank",
      "noopener,noreferrer"
    );
    await setStatus(replyTo.id, "responded");
    setReplyTo(null);
  };

  const counts = useMemo(() => {
    const c = { all: items.length, pending: 0, read: 0, responded: 0 } as Record<Filter, number>;
    items.forEach((i) => {
      const s = (i.status || "pending") as Filter;
      if (s in c) c[s] += 1;
    });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      const status = i.status || "pending";
      const statusOk = filter === "all" ? true : status === filter;
      const queryOk =
        !q ||
        [i.name, i.email, i.phone || "", i.subject, i.message]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return statusOk && queryOk;
    });
  }, [items, filter, query]);

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Contact Messages
            <Badge variant="secondary">{counts.all}</Badge>
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            {(["all", "pending", "read", "responded"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
              </Button>
            ))}
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, email, phone, subject or message"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
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
                    <div className="space-y-1">
                      <div className="font-semibold">{s.subject}</div>
                      <div className="text-sm text-muted-foreground">
                        From <span className="font-medium text-foreground">{s.name}</span>{" "}
                        <a className="underline" href={`mailto:${s.email}`}>
                          {s.email}
                        </a>
                      </div>
                      {s.phone && (
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <a className="underline" href={`tel:${s.phone}`}>
                            {s.phone}
                          </a>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(s.created_at), "PPp")}
                      </div>
                    </div>
                    <Badge
                      variant={
                        status === "responded"
                          ? "outline"
                          : status === "read"
                          ? "secondary"
                          : "default"
                      }
                    >
                      {status}
                    </Badge>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{s.message}</p>
                  <div className="flex gap-2 pt-2 flex-wrap">
                    <Button size="sm" onClick={() => openReply(s)}>
                      <Reply className="h-4 w-4 mr-1" /> Reply
                    </Button>
                    {status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(s.id, "read")}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Mark as read
                      </Button>
                    )}
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

      <Dialog open={!!replyTo} onOpenChange={(o) => !o && setReplyTo(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reply to {replyTo?.name}</DialogTitle>
            <DialogDescription>
              {replyTo?.email}
              {replyTo?.phone ? ` · ${replyTo.phone}` : ""}
            </DialogDescription>
          </DialogHeader>
          {replyTo && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted p-3 text-sm">
                <div className="font-medium">{replyTo.subject}</div>
                <p className="whitespace-pre-wrap text-muted-foreground">{replyTo.message}</p>
              </div>
              <Textarea
                rows={8}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Write your reply..."
              />
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            {replyTo?.phone && (
              <Button variant="outline" onClick={sendWhatsAppReply}>
                <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
              </Button>
            )}
            <Button onClick={sendEmailReply}>
              <Send className="h-4 w-4 mr-1" /> Send email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ContactSubmissionsViewer;
