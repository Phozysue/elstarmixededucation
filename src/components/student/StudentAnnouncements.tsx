import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string | null;
  created_at: string;
}

const StudentAnnouncements = () => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("announcements")
      .select("id, title, content, priority, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setItems((data as any) || []);
        setLoading(false);
      });
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" /> Announcements
        </CardTitle>
        <CardDescription>Latest school announcements</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No announcements yet</p>
        ) : (
          items.map((a) => (
            <div key={a.id} className="border rounded-md p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="font-medium">{a.title}</h4>
                {a.priority && <Badge variant="outline">{a.priority}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(a.created_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default StudentAnnouncements;
