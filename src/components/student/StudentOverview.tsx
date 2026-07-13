import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ClipboardCheck, Megaphone, Calendar } from "lucide-react";

interface Props {
  studentId: string;
  classId: string | null;
}

const StudentOverview = ({ studentId, classId }: Props) => {
  const [stats, setStats] = useState<Record<string, number | string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const todayIso = new Date().toISOString();

      let assignmentsTotal = 0;
      let pending = 0;
      if (classId) {
        // Find class_subject ids for this class
        const { data: cs } = await supabase
          .from("class_subjects")
          .select("id")
          .eq("class_id", classId);
        const csIds = (cs || []).map((x) => x.id);

        if (csIds.length) {
          const { data: assignments } = await supabase
            .from("assignments")
            .select("id, due_date")
            .in("class_subject_id", csIds);
          assignmentsTotal = (assignments || []).length;
          const assignmentIds = (assignments || []).map((a) => a.id);

          if (assignmentIds.length) {
            const { data: subs } = await supabase
              .from("assignment_submissions")
              .select("assignment_id")
              .eq("student_id", studentId)
              .in("assignment_id", assignmentIds);
            const submittedIds = new Set((subs || []).map((s) => s.assignment_id));
            pending = (assignments || []).filter(
              (a) => !submittedIds.has(a.id) && (!a.due_date || a.due_date >= todayIso)
            ).length;
          } else {
            pending = 0;
          }
        }
      }

      // Attendance %
      const { data: attRows } = await supabase
        .from("attendance")
        .select("status")
        .eq("student_id", studentId);
      const total = (attRows || []).length;
      const present = (attRows || []).filter((r) => r.status === "present").length;
      const attendancePct = total ? Math.round((present / total) * 100) : 0;

      const { count: announcements } = await supabase
        .from("announcements")
        .select("*", { count: "exact", head: true });

      const { count: events } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .gte("event_date", todayIso);

      setStats({
        assignmentsTotal,
        pending,
        attendance: `${attendancePct}%`,
        announcements: announcements || 0,
        events: events || 0,
      });
      setLoading(false);
    };
    load();
  }, [studentId, classId]);

  const cards = [
    { title: "Pending Assignments", key: "pending", icon: FileText, highlight: true },
    { title: "Total Assignments", key: "assignmentsTotal", icon: FileText },
    { title: "Attendance", key: "attendance", icon: ClipboardCheck },
    { title: "Upcoming Events", key: "events", icon: Calendar },
    { title: "Announcements", key: "announcements", icon: Megaphone },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Overview</h2>
        <p className="text-muted-foreground">Your latest activity at a glance</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.key} className={c.highlight && Number(stats[c.key] ?? 0) > 0 ? "border-primary" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{c.title}</CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loading ? "—" : stats[c.key]}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default StudentOverview;
