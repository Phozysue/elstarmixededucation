import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

interface Subject {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
}

const StudentSubjects = ({ classId }: { classId: string | null }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!classId) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("class_subjects")
        .select("subjects (id, name, code, description)")
        .eq("class_id", classId);
      const list = (data || [])
        .map((r: any) => r.subjects)
        .filter(Boolean);
      setSubjects(list);
      setLoading(false);
    };
    load();
  }, [classId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" /> My Subjects
        </CardTitle>
        <CardDescription>Subjects assigned to your class</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : !classId ? (
          <p className="text-muted-foreground text-sm">You are not assigned to a class yet.</p>
        ) : subjects.length === 0 ? (
          <p className="text-muted-foreground text-sm">No subjects assigned to your class yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subjects.map((s) => (
              <div key={s.id} className="border rounded-md p-3">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium">{s.name}</h4>
                  {s.code && <Badge variant="secondary">{s.code}</Badge>}
                </div>
                {s.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{s.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentSubjects;
