import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ClipboardCheck, Megaphone, Calendar } from "lucide-react";

const TeacherOverview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const todayIso = new Date().toISOString();
      const today = todayIso.split("T")[0];

      // Assignments created by this teacher
      const { data: myAssignments } = await supabase
        .from("assignments")
        .select("id")
        .eq("created_by", user.id);
      const assignmentIds = (myAssignments || []).map((a) => a.id);

      let ungraded = 0;
      let totalSubs = 0;
      if (assignmentIds.length) {
        const { count: subCount } = await supabase
          .from("assignment_submissions")
          .select("*", { count: "exact", head: true })
          .in("assignment_id", assignmentIds);
        totalSubs = subCount || 0;

        const { count: ungradedCount } = await supabase
          .from("assignment_submissions")
          .select("*", { count: "exact", head: true })
          .in("assignment_id", assignmentIds)
          .is("marks_obtained", null);
        ungraded = ungradedCount || 0;
      }

      const { count: announcements } = await supabase
        .from("announcements")
        .select("*", { count: "exact", head: true });

      const { count: events } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .gte("event_date", todayIso);

      const { count: attendanceToday } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("date", today);

      setStats({
        myAssignments: assignmentIds.length,
        totalSubs,
        ungraded,
        announcements: announcements || 0,
        events: events || 0,
        attendanceToday: attendanceToday || 0,
      });
      setLoading(false);
    };
    load();
  }, [user]);

  const cards = [
    { title: "My Assignments", key: "myAssignments", icon: FileText },
    { title: "Total Submissions", key: "totalSubs", icon: FileText },
    { title: "Ungraded Submissions", key: "ungraded", icon: ClipboardCheck, highlight: true },
    { title: "Attendance Marked Today", key: "attendanceToday", icon: ClipboardCheck },
    { title: "Upcoming Events", key: "events", icon: Calendar },
    { title: "Announcements", key: "announcements", icon: Megaphone },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Overview</h2>
        <p className="text-muted-foreground">Things that need your attention</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.key} className={c.highlight && (stats[c.key] ?? 0) > 0 ? "border-primary" : ""}>
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

export default TeacherOverview;
