import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, BookOpen, Mail, FileText, Calendar, Megaphone, ClipboardCheck } from "lucide-react";
import { Link } from "react-router-dom";

const AdminOverview = () => {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const todayIso = new Date().toISOString();
      const countOf = async (table: string, filter?: (q: any) => any) => {
        let q: any = supabase.from(table as any).select("*", { count: "exact", head: true });
        if (filter) q = filter(q);
        const { count } = await q;
        return count || 0;
      };

      const [students, teachers, classes, messages, admissions, events, dates, announcements] = await Promise.all([
        countOf("students"),
        countOf("teachers"),
        countOf("classes"),
        countOf("contact_submissions", (q) => q.eq("status", "new")),
        countOf("admission_applications", (q) => q.eq("status", "pending")),
        countOf("events", (q) => q.gte("event_date", todayIso)),
        countOf("important_dates", (q) => q.eq("is_active", true)),
        countOf("announcements"),
      ]);

      setStats({ students, teachers, classes, messages, admissions, events, dates, announcements });
      setLoading(false);
    };
    load();
  }, []);

  const cards = [
    { title: "Students", key: "students", icon: Users, tab: "students" },
    { title: "Teachers", key: "teachers", icon: GraduationCap, tab: "teachers" },
    { title: "Classes", key: "classes", icon: BookOpen, tab: "classes" },
    { title: "New Messages", key: "messages", icon: Mail, tab: "messages", highlight: true },
    { title: "Pending Admissions", key: "admissions", icon: FileText, tab: "messages", highlight: true },
    { title: "Announcements", key: "announcements", icon: Megaphone, tab: "announcements" },
    { title: "Upcoming Events", key: "events", icon: Calendar, tab: "events" },
    { title: "Active Important Dates", key: "dates", icon: ClipboardCheck, tab: "important-dates" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Overview</h2>
        <p className="text-muted-foreground">At-a-glance summary of school activity</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link key={c.key} to={`/admin?tab=${c.tab}`}>
            <Card className={`hover:shadow-md transition-shadow ${c.highlight && (stats[c.key] ?? 0) > 0 ? "border-primary" : ""}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{c.title}</CardTitle>
                <c.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{loading ? "—" : stats[c.key]}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminOverview;
