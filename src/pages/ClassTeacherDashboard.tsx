import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoadingScreen from "@/components/LoadingScreen";
import AttendanceManagement from "@/components/admin/AttendanceManagement";
import ReportCardsManagement from "@/components/teacher/ReportCardsManagement";
import AnnouncementsManagement from "@/components/admin/AnnouncementsManagement";

const ClassTeacherDashboard = () => {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(true);
  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: teacher } = await supabase.from("teachers").select("id").eq("user_id", user.id).maybeSingle();
      if (teacher) {
        const { data: cls } = await supabase.from("classes").select("id,name,section").eq("class_teacher_id", teacher.id);
        setMyClasses(cls ?? []);
        if (cls?.length) {
          const ids = cls.map(c => c.id);
          const { data: st } = await supabase.from("students").select("id,student_id,class_id,profiles:user_id(full_name)").in("class_id", ids);
          setStudents(st ?? []);
        }
      }
      setBusy(false);
    })();
  }, [user]);

  if (loading || busy) return <LoadingScreen message="Loading class teacher dashboard..." />;

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="mb-6"><CardHeader>
        <CardTitle className="text-3xl">Class Teacher</CardTitle>
        <CardDescription>Attendance, report cards and class announcements</CardDescription>
      </CardHeader></Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Assigned Classes</div><div className="text-2xl font-bold">{myClasses.length}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total Students</div><div className="text-2xl font-bold">{students.length}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Classes</div><div className="text-sm">{myClasses.map(c => `${c.name}${c.section ? " " + c.section : ""}`).join(", ") || "—"}</div></CardContent></Card>
      </div>

      {myClasses.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          You are not assigned as a class teacher yet. Contact the administrator.
        </CardContent></Card>
      ) : (
        <Tabs defaultValue="students">
          <TabsList>
            <TabsTrigger value="students">Class List</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="reports">Report Cards</TabsTrigger>
            <TabsTrigger value="announce">Announcements</TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <Card><CardContent className="pt-6 overflow-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b">{["Admission", "Name", "Class"].map(h => <th key={h} className="text-left py-2 px-2">{h}</th>)}</tr></thead>
                <tbody>{students.map(s => {
                  const c = myClasses.find(x => x.id === s.class_id);
                  return <tr key={s.id} className="border-b">
                    <td className="py-2 px-2">{s.student_id}</td>
                    <td className="py-2 px-2">{s.profiles?.full_name ?? "-"}</td>
                    <td className="py-2 px-2">{c?.name}{c?.stream ? " " + c.stream : ""}</td>
                  </tr>;
                })}</tbody>
              </table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="attendance"><AttendanceManagement /></TabsContent>
          <TabsContent value="reports"><ReportCardsManagement /></TabsContent>
          <TabsContent value="announce"><AnnouncementsManagement /></TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default ClassTeacherDashboard;
